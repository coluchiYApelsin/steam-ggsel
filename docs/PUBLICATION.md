# Подготовка публикации — 11 октября 2026

Проект продолжен от `b0a8184` в существующей ветке `master`. До работы дерево было чистым; remote отсутствовал. Исходники версии 0.8.2 не изменялись.

## Проверки

- Повторный `BUILD.cmd`: 57 тестов, 303 expect, 0 ошибок; TypeScript и четыре секции Starlight успешно.
- Повторная сборка совпала с ранее проверенной в Steam: SHA-256 `71492DB88DBCBDFE43AF017C6CE7E70793C893D116BD35D02CEE6C7E1C0790D6`.
- Все 12 доступных коммитов и 155 уникальных blobs, а также публикуемые рабочие файлы проверены по шаблонам токенов GitHub, приватных ключей, AWS credentials, JWT, присвоений секретов, URL с credentials, личных путей и email. Единственные совпадения — синтетический отрицательный URL `https://user@ggsel.net/...` в тесте валидации. Это не реальные credentials. Проверка по шаблонам не является гарантией отсутствия любого возможного секрета.
- История авторов использует `Codex <codex@localhost>`. Локальные диагностика, инструменты, зависимости, кэши, `.env` и сборки исключены из Git. Исторический `build-log.txt` проверен отдельно; он удалён из текущего дерева. История не переписывалась.
- README содержит независимый дисклеймер, инструкции сборки, установки, обновления и удаления. Подтверждённые сквозные результаты сохранены без новых заявлений об оплате.
- Собственная лицензия не назначалась: подтверждённого выбора правообладателя в истории нет. Условия сторонних компонентов описаны в `THIRD_PARTY.md`.

## Причина прежнего сбоя

`gh auth status`: `You are not logged into any GitHub hosts. To log in, run: gh auth login`.

Git и GitHub CLI установлены в `.tools/`, но отсутствуют в PATH текущего процесса. Это исправляется использованием полных локальных путей. `origin` не настроен. HTTPS к `github.com` и `api.github.com` отвечает HTTP 200 с включённой проверкой TLS. Поэтому подтверждённое препятствие — незавершённая авторизация, а не текущая ошибка HTTPS. Предыдущий отказ запуска браузера описан в HANDOFF; новая попытка официального `gh auth login --web` ожидает подтверждения пользователя.

## Статус

Публикация пока не подтверждена. Проверить аккаунт, существующий репозиторий и права можно после официальной авторизации. Release следует пометить предварительным: `.star` проверен, но полный checkout, платежи и 3DS не тестировались.

Команды продолжения из корня проекта после авторизации (сначала проверить существующие репозитории):

```powershell
$env:PATH = "$PWD\.tools\git\cmd;$env:PATH"
& .tools/gh/bin/gh.exe auth status
& .tools/gh/bin/gh.exe api user --jq .login
& .tools/gh/bin/gh.exe repo list --limit 100 --json name,url,visibility
# Если steam-ggsel ещё не существует:
& .tools/gh/bin/gh.exe repo create steam-ggsel --public --source . --remote origin
& .tools/gh/bin/gh.exe auth setup-git
& .tools/git/cmd/git.exe push -u origin master
# Обязательно сравнить SHA GitHub и локальный HEAD:
& .tools/git/cmd/git.exe rev-parse HEAD
& .tools/git/cmd/git.exe ls-remote origin refs/heads/master
& .tools/gh/bin/gh.exe repo view --json url,visibility,defaultBranchRef
```
