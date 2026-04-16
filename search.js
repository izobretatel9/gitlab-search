// 1. Импорты библиотек
const commander = require('commander');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const slugify = require('slugify');
const { Gitlab } = require('@gitbeaker/rest');
const { version: softVersion } = require('./package.json');

// 2. Загрузка переменных окружения
dotenv.config();

// 3. Конфигурация командной строки
commander.program
  .requiredOption('-s, --search <string>', 'String to search in files')
  .option('-p, --pattern <string>', 'File pattern filter (eg. *.php)')
  .option('-g, --group <string>', 'Gitlab group ID to search in')
  .option('--include-subgroup', 'Include subgroups when searching in a custom group')
  .option('-d, --delay <number>', 'API rate limiter in milliseconds (default=4000)')
  .option('--host <string>', 'Gitlab instance host (default=https://gitlab.com)')
  .option('--token <string>', 'Your personal Gitlab token (api_read)')
  .option('--exclude <string>', 'Exclude matches containing this string')
  .name("node search")
  .usage("-s test -p \"*.php\"")
  .version(softVersion)
  .showHelpAfterError();
commander.program.parse();

// 4. Установка переменных окружения
const options = commander.program.opts();
process.env.SEARCH_KEYWORD = options.search || process.env.SEARCH_KEYWORD || '';
process.env.SEARCH_FILE_PATTERN = options.pattern || process.env.SEARCH_FILE_PATTERN || "*";
process.env.GROUP_ID = options.group || process.env.GROUP_ID || '';
process.env.INCLUDE_SUBGROUP = options.includeSubgroup || process.env.INCLUDE_SUBGROUP || true;
process.env.SEARCH_DELAY = options.delay || process.env.SEARCH_DELAY || 4000;
process.env.GITLAB_HOST = options.host || process.env.GITLAB_HOST || 'https://gitlab.com';
process.env.GITLAB_TOKEN = options.token || process.env.GITLAB_TOKEN || null;
process.env.EXCLUDE_KEYWORD = options.exclude || process.env.EXCLUDE_KEYWORD || '';

// 5. Генерация ID поиска
const hash = crypto.createHash('sha256');
hash.update(JSON.stringify({
  SEARCH_KEYWORD: process.env.SEARCH_KEYWORD,
  SEARCH_FILE_PATTERN: process.env.SEARCH_FILE_PATTERN,
  GROUP_ID: process.env.GROUP_ID,
  INCLUDE_SUBGROUP: process.env.INCLUDE_SUBGROUP,
  GITLAB_HOST: process.env.GITLAB_HOST,
  GITLAB_TOKEN: process.env.GITLAB_TOKEN
}));
const searchId = hash.digest('hex').slice(0, 8) + '_' + slugify(process.env.SEARCH_KEYWORD);

// 6. Запуск основной функции
__run();

// 7. Основная функция
function __run() {
  const api = new Gitlab({
    host: process.env.GITLAB_HOST,
    token: process.env.GITLAB_TOKEN,
  });

  console.log(`🔍 Search: ${process.env.SEARCH_FILE_PATTERN} ? "${process.env.SEARCH_KEYWORD}"`);
  if (process.env.GROUP_ID) {
    console.log(`👥 Group: ${process.env.GROUP_ID} ${process.env.INCLUDE_SUBGROUP ? '(*)' : ''}`);
  }
  console.log(`💾 Output file: search-results_${searchId}.json\n`);

  // 7.1 Функция получения всех групп
  async function getGroups() {
    return await api.Groups.all({ perPage: 100 });
  }

  // 7.2 Функция получения проектов группы
  async function getGroupProjects(group) {
    return await api.Groups.allProjects(group.id, {
      perPage: 100,
      includeSubgroups: process.env.INCLUDE_SUBGROUP || false,
    });
  }

  // 7.3 Поиск в проекте
  async function searchInProject(project, search) {
    try {
      return await api.Search.all("blobs", search, {
        projectId: project.id,
        perPage: 100,
      });
    } catch (e) {
      console.error('❌ Error searching in project:', project.name, e.message);
      process.exit(1);
    }
  }

  // 7.4 Нормализация пути проекта
  async function getProjectPath(project) {
    return project.path_with_namespace.replace(/\s+/g, '-').toLowerCase();
  }

  // 7.5 Основной процесс
  (async function () {
    const resultFile = path.resolve('./', `search-results_${searchId}.json`);
    let searchResults = {};

    if (fs.existsSync(resultFile)) {
      try {
        searchResults = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
      } catch (e) {
        console.warn('⚠️ Warning: Failed to parse existing result file.');
      }
    }

    let groups = [];
    if (!process.env.GROUP_ID) {
      groups = await getGroups();
    } else {
      groups = [{ id: process.env.GROUP_ID }];
    }

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const projects = await getGroupProjects(group);

      for (let j = 0; j < projects.length; j++) {
        const project = projects[j];
        const normalizedPath = await getProjectPath(project);

        console.log('------------------------------------------------------------');
        console.log(`📁 Project: ${project.name_with_namespace}`);

        if (searchResults[project.id]) {
          console.log('✅ Already processed');
          continue;
        }

        searchResults[project.id] = {
          groupId: group?.id || null,
          groupName: group?.name || null,
          projectId: project.id,
          projectName: project.name_with_namespace,
          chunks: [],
        };

        await new Promise(resolve => setTimeout(resolve, process.env.SEARCH_DELAY));

        const filter = [process.env.SEARCH_KEYWORD];
        if (process.env.SEARCH_FILE_PATTERN && process.env.SEARCH_FILE_PATTERN !== '*') {
          filter.push('filename:' + process.env.SEARCH_FILE_PATTERN);
        }

        const results = await searchInProject(project, filter.join(' '));

        let filteredResults = results;

        if (process.env.EXCLUDE_KEYWORD) {
          const exclude = process.env.EXCLUDE_KEYWORD.toLowerCase();

          filteredResults = results.filter(element => {
            const data = (element.data || '').toLowerCase();
            const path = (element.path || '').toLowerCase();

            return !data.includes(exclude) && !path.includes(exclude);
          });
        }

        for (let k = 0; k < filteredResults.length; k++) {
          const element = results[k];
          const fileUrl = `${process.env.GITLAB_HOST}/${normalizedPath}/-/blob/${project.default_branch}/${element.path}`;
          console.log(`➕ ${fileUrl}`);

          element.data = element.data.replace("\t", "  ").split("\n");
          searchResults[project.id].chunks.push(element);
        }

        fs.writeFileSync(resultFile, JSON.stringify(searchResults, null, 2));
      }
    }
  })();
}