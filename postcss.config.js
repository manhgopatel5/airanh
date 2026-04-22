// ✅ ESM cho Next 15 + "type": "module"
export default {
  plugins: {
    // 1. Import phải đầu tiên để inline @import
    "postcss-import": {},
    
    // 2. Tailwind + nesting tích hợp
    tailwindcss: {},
    
    // 3. preset-env stage 2 + preserve custom-properties cho dark mode
    "postcss-preset-env": {
      stage: 2, // Stage 2 an toàn, không phá CSS var
      autoprefixer: {
        flexbox: "no-2009",
        grid: "autoplace",
      },
      features: {
        "custom-properties": { preserve: true }, // Giữ var(--bg)
        "nesting-rules": true, // Dùng tích hợp, không cần plugin riêng
      },
    },
    
    // 4. Fix bug flex cho Safari cũ
    "postcss-flexbugs-fixes": {},
    
    // 5. Polyfill :focus-visible cho accessibility
    "postcss-focus-visible": {},
    
    // 6. Reporter để log lỗi dễ đọc trong CI
    ...(process.env.CI && { "postcss-reporter": { clearReportedMessages: true } }),
    
    // 7. Minify an toàn, không phá Tailwind
    ...(process.env.NODE_ENV === "production"
      ? {
          cssnano: {
            preset: [
              "default",
              {
                discardComments: { removeAll: true },
                normalizeWhitespace: true,
                colormin: false, // Tắt để giữ rgb(var(--bg) / 0.5)
                minifyFontValues: { removeQuotes: false }, // Giữ quotes cho font
                minifySelectors: true,
                calc: false, // Giữ calc() cho clamp()
                convertValues: { length: false }, // Giữ px, không đổi rem
              },
            ],
          },
        }
      : {}),
  },
};
