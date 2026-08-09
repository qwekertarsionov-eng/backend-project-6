import pluginJs from "@eslint/js";
import globals from "globals";

export default [
  {
    // Указываем, какие файлы проверять
    files: ["**/*.js"],
    languageOptions: {
      // Настройка глобальных переменных для Node.js окружения
      globals: {
        ...globals.node,
        ...globals.jest, // если будут тесты на Jest
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  // Включаем рекомендуемые правила ESLint
  pluginJs.configs.recommended,
  {
    // Здесь вы можете отключать или переопределять правила, если нужно
    rules: {
      "no-unused-vars": "warn", // предупреждать о неиспользуемых переменных
      "no-console": "off",      // разрешить использование console.log
    },
  },
];
