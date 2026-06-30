# AIR (Airanh)

Nền tảng kết nối việc làm tự do và sự kiện xã hội tại Việt Nam.

## Tech stack

- Next.js 15 (App Router)
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Firebase (Auth, Firestore, Storage, FCM)
- Zustand + SWR

## Development

```bash
pnpm install
pnpm dev
```

## Environment

Copy `.env.local` and configure Firebase credentials:

- `NEXT_PUBLIC_FIREBASE_*`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
