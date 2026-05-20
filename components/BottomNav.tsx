14:55:28.715 Running build in Washington, D.C., USA (East) – iad1
14:55:28.716 Build machine configuration: 4 cores, 8 GB
14:55:28.811 Cloning github.com/manhgopatel5/airanh (Branch: main, Commit: bf44abb)
14:55:29.248 Cloning completed: 437.000ms
14:55:31.075 Restored build cache from previous deployment (52KWRUXjz76n6V5rtrFJBMA8xPer)
14:55:31.308 Running "vercel build"
14:55:31.322 Vercel CLI 54.2.0
14:55:31.523 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
14:55:31.545 Installing dependencies...
14:55:34.317 
14:55:34.317 > airanh-app@1.0.0 prepare
14:55:34.317 > husky
14:55:34.318 
14:55:34.385 
14:55:34.385 up to date in 3s
14:55:34.385 
14:55:34.385 319 packages are looking for funding
14:55:34.385   run `npm fund` for details
14:55:34.393 Detected Next.js version: 15.5.15
14:55:34.400 Running "npm run build"
14:55:34.516 
14:55:34.516 > airanh-app@1.0.0 build
14:55:34.517 > next build
14:55:34.517 
14:55:35.183    ▲ Next.js 15.5.15
14:55:35.184    - Environments: .env.local
14:55:35.184    - Experiments (use with caution):
14:55:35.184      · serverActions
14:55:35.184      · optimizePackageImports
14:55:35.184 
14:55:35.364    Creating an optimized production build ...
14:55:48.995 
14:55:48.996 app/globals.css
14:55:48.996 1:1	⚠  Complex selectors in '.group:hover .dark\:group-hover\:text-gray-50:is(.dark *)' can not be transformed to an equivalent selector without ':is()'. [postcss-is-pseudo-class]
14:55:48.996 1:1	⚠  Complex selectors in '.group:hover .dark\:group-hover\:text-zinc-300:is(.dark *)' can not be transformed to an equivalent selector without ':is()'. [postcss-is-pseudo-class]
14:55:48.996 1:1	⚠  Complex selectors in '.group:hover .dark\:group-hover\:text-gray-50:is(.dark *)' can not be transformed to an equivalent selector without ':is()'. [postcss-is-pseudo-class]
14:55:48.996 1:1	⚠  Complex selectors in '.group:hover .dark\:group-hover\:text-zinc-300:is(.dark *)' can not be transformed to an equivalent selector without ':is()'. [postcss-is-pseudo-class]
14:55:48.996 1:1	⚠  Complex selectors in '.group:hover .dark\:group-hover\:text-gray-50:is(.dark *)' can not be transformed to an equivalent selector without ':is()'. [postcss-is-pseudo-class]
14:55:48.997 1:1	⚠  Complex selectors in '.group:hover .dark\:group-hover\:text-zinc-300:is(.dark *)' can not be transformed to an equivalent selector without ':is()'. [postcss-is-pseudo-class]
14:55:48.997 
14:55:48.997  ⚠ 6 problems (0 errors, 6 warnings)
14:55:48.997 
14:55:53.501  ✓ Compiled successfully in 17.8s
14:55:53.506    Linting and checking validity of types ...
14:56:05.836 Failed to compile.
14:56:05.836 
14:56:05.836 ./components/BottomNav.tsx:74:24
14:56:05.837 Type error: Argument of type '"close"' is not assignable to parameter of type '"task" | "plan"'.
14:56:05.837 
14:56:05.837   72 |           onDragEnd={(_, info) => {
14:56:05.837   73 |             if (info.offset.y > 80 || info.velocity.y > 500) {
14:56:05.837 > 74 |               onSelect("close");
14:56:05.837      |                        ^
14:56:05.837   75 |             }
14:56:05.837   76 |           }}
14:56:05.837   77 |           style={{ y, opacity, scale }}
14:56:05.877 Next.js build worker exited with code: 1 and signal: null
14:56:05.958 Error: Command "npm run build" exited with 1