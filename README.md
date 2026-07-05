# Blog

ActivityPub을 지원하는 연합형(federated) 블로그입니다. Next.js App Router 기반의 웹 앱과 Fedify 기반 Federation 레이어를 함께 사용해 블로그 글, 액터, 인박스/디스패치 흐름을 Fediverse와 연결합니다.

## 기술 스택

- Next.js App Router, React, TypeScript
- Tailwind CSS
- Prisma, PostgreSQL
- Redis
- Fedify, `@fedify/next`
- S3-compatible object storage
- Better Auth
- Vitest
- oxlint, oxfmt
- Docker Compose

## 시작하기

이 저장소는 `pnpm@11.9.0`을 사용합니다.

```bash
pnpm install
pnpm dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

주요 명령어:

- `pnpm dev`: Next.js 개발 서버 실행
- `pnpm start`: 프로덕션 빌드 후 Next.js 서버 실행
- `pnpm format`: oxfmt로 포맷 적용
- `pnpm lint`: oxlint로 린트 및 자동 수정
- `pnpm typecheck`: TypeScript 타입 검사
- `pnpm test`: Vitest 테스트 실행
- `pnpm prisma <command>`: Prisma CLI 실행

## 로컬 서비스

개발용 Docker Compose 파일은 `compose.dev.yml`입니다.

```bash
docker compose -f compose.dev.yml up
```

개발 Compose는 앱 컨테이너와 함께 PostgreSQL 17(`postgres:17-alpine`)과 Redis 8(`redis:8-alpine`)을 실행합니다. 앱은 게시글/사용자 데이터를 PostgreSQL에 저장하고, `src/federation.ts`의 Fedify 큐/캐시 흐름에서 Redis를 필요로 합니다.

이미지 업로드와 공개 URL 생성을 위해 S3-compatible object storage도 필요합니다. 로컬에서 별도 S3 호환 서비스를 쓰거나 외부 버킷 정보를 환경 변수로 제공하세요.

## 환경 변수

필요한 값을 `.env` 등에 설정합니다. 비밀 값은 저장소에 커밋하지 마세요.

- `DATABASE_URL`
- `REDIS_URL`
- `PUBLIC_URL`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_PUBLIC_URL`
- `POSTGRES_USER`
- `POSTGRES_DB`

## Prisma

Prisma schema는 `src/prisma/schema.prisma`에 있습니다. 스키마 변경은 먼저 이 파일에서 수행하고, 마이그레이션 생성/적용 및 클라이언트 생성은 항상 `pnpm prisma <command>`를 통해 실행합니다.

예시:

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

마이그레이션 파일은 수동으로 만들거나 편집하지 않습니다.

## Fediverse 로컬 개발

ActivityPub Federation을 실제 Fediverse 서버와 테스트하려면 `PUBLIC_URL`이 외부에서 접근 가능한 URL이어야 합니다. 로컬 터널이 필요하면 다음 명령을 사용할 수 있습니다.

```bash
pnpm tunnel
```

`src/federation.ts`는 모듈 로드 시 `REDIS_URL`과 `PUBLIC_URL`을 사용하므로, Federation 관련 개발과 테스트에서는 Redis가 실행 중이고 두 환경 변수가 설정되어 있어야 합니다.
