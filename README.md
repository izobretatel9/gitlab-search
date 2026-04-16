# GitLab Search CLI (Node.js)

## Описание

CLI-инструмент для поиска по содержимому файлов в GitLab группах и проектах.

Поддерживает:
- поиск по ключевым словам в blob’ах
- фильтрацию по маске файлов
- исключение совпадений
- обход групп и проектов
- ограничение API rate limit

> ⚠️ Ограничение: GitLab API имеет низкий rate limit (≈10 req/min).  
> При большом количестве проектов выполнение может занимать значительное время.  
> Например: ~100 проектов ≈ 10–12 минут выполнения.

---

## Параметры CLI

| Параметр | Описание |
|----------|----------|
| `-s, --search <string>` | Строка для поиска |
| `-p, --pattern <string>` | Фильтр файлов (например `*.yml`, `Dockerfile*`) |
| `-g, --group <string>` | ID группы GitLab |
| `--include-subgroup` | Включить подгруппы (ms, default: *)|
| `-d, --delay <number>` | Задержка между запросами (ms, default: 4000) |
| `--host <string>` | GitLab instance URL (default: https://gitlab.com) |
| `--token <string>` | Personal Access Token |
| `--exclude <string>` | Исключить результаты, содержащие строку |

---

## Сборка Docker образа

```bash
## Сборка и запуск через docker
docker build -t gitlab-search .
```

```bash
docker run --rm \
  gitlab-search \
  -s "FROM alpine" \
  -p "Dockerfile*" \
  -g "4588" \
  --host "https://git.xxx.ru" \
  --token "xxx"
```

## Запуск черз Node.js

```bash
##У становка зависимостей
npm install
```

```bash
## Поиск всех Dockerfile без Alpine
node search.js \
  -s "FROM" 
  --exclude "alpine" \
  -p "Dockerfile*" \
  -g "4588" \
  --host "https://git.xxx.ru" \
  --token "xxx" | tee other.txt
```

## Быстрый старт через GitLab Pipelines

[![Run Pipeline](https://img.shields.io/badge/GitLab-Run_Pipeline-blue?logo=gitlab)](https://gitlab.xxx.com/adas/devops/gitlab-search/-/pipelines/new)