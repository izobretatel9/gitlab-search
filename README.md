# NodeJS Cli Gitlab Finder

## Описание

Этот проект очень простой: нужно только указать несколько переменных окружения и можно запускать поиск.

> ⚠️ **Внимание:** из-за очень низкого лимита запросов в GitLab API (10 запросов в минуту) поиск может занять продолжительное время.  
> Например, на поиск по 100 проектам уходит около 700 секунд (~11 минут).


## Быстрый старт

[![Run Pipeline](https://img.shields.io/badge/GitLab-Run_Pipeline-blue?logo=gitlab)](https://gitlab.xxx.com/adas/devops/gitlab-search/-/pipelines/new)

# Сборка и запуск через docker
```
docker build -t gitlab-search .
```
```
docker run --rm \
  gitlab-search \
  -s "FROM alpine" \
  -p "Dockerfile*" \
  -g "4588" \
  --host "https://git.xxx.ru" \
  --token "xxx"
```