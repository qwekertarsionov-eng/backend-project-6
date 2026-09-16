export default {
  ru: {
    lang: 'ru',
    appName: 'Менеджер задач',
    flash: {
      users: {
        create: {
          success: 'Пользователь успешно зарегистрирован',
          error: 'Не удалось зарегистрировать пользователя',
        },
        update: {
          success: 'Пользователь успешно изменён',
          error: 'Не удалось изменить пользователя',
        },
        delete: {
          success: 'Пользователь успешно удалён',
          error: 'Не удалось удалить пользователя',
        },
      },
      statuses: {
        create: { success: 'Статус успешно создан', error: 'Не удалось создать статус' },
        update: { success: 'Статус успешно изменён', error: 'Не удалось изменить статус' },
        delete: { success: 'Статус успешно удалён', error: 'Нельзя удалить статус' },
      },
      tasks: {
        create: { success: 'Задача успешно создана', error: 'Не удалось создать задачу' },
        update: { success: 'Задача успешно изменена', error: 'Не удалось изменить задачу' },
        delete: { success: 'Задача успешно удалена', error: 'Удалять задачу может только её создатель' },
      },
      labels: {
        create: { success: 'Метка успешно создана', error: 'Не удалось создать метку' },
        update: { success: 'Метка успешно изменена', error: 'Не удалось изменить метку' },
        delete: { success: 'Метка успешно удалена', error: 'Нельзя удалить метку' },
      },
    },
    views: {
      layouts: {
        application: {
          users: 'Пользователи',
          tasks: 'Задачи',
          statuses: 'Статусы',
          labels: 'Метки',
          login: 'Вход',
          register: 'Регистрация',
          logout: 'Выход',
        },
      },
      index: {
        hello: 'Привет от Хекслета!',
        description: 'Практические курсы по программированию',
        more: 'Узнать больше',
      },
      users: {
        id: 'ID',
        fullName: 'Полное имя',
        email: 'Email',
        firstName: 'Имя',
        lastName: 'Фамилия',
        password: 'Пароль',
        createdAt: 'Дата создания',
        actions: 'Действия',
        index: {
          empty: 'Пользователей пока нет',
        },
        new: {
          submit: 'Регистрация',
        },
        edit: {
          title: 'Изменение пользователя',
          submit: 'Сохранить',
        },
        delete: {
          submit: 'Удалить',
        },
      },
      statuses: {
        id: 'ID',
        name: 'Наименование',
        createdAt: 'Дата создания',
        actions: 'Действия',
        index: {
          title: 'Статусы',
          create: 'Создать статус',
          empty: 'Статусов пока нет',
        },
        new: {
          title: 'Создание статуса',
          submit: 'Создать',
        },
        edit: {
          title: 'Изменение статуса',
          submit: 'Сохранить',
        },
        delete: {
          submit: 'Удалить',
        },
      },
      tasks: {
        id: 'ID',
        name: 'Наименование',
        description: 'Описание',
        status: 'Статус',
        creator: 'Автор',
        executor: 'Исполнитель',
        createdAt: 'Дата создания',
        actions: 'Действия',
        index: {
          title: 'Задачи',
          create: 'Создать задачу',
          empty: 'Задач не найдено',
        },
        new: { title: 'Создание задачи', submit: 'Создать' },
        edit: { title: 'Изменение задачи', submit: 'Сохранить' },
        show: { title: 'Просмотр задачи' },
        labels: 'Метки',
        selectStatus: 'Выберите статус',
        noDescription: 'Описания нет',
        delete: {
          submit: 'Удалить',
        },
        filter: {
          status: 'Статус',
          executor: 'Исполнитель',
          label: 'Метка',
          isCreator: 'Только мои задачи',
          submit: 'Показать',
        },
      },
      labels: {
        id: 'ID',
        name: 'Наименование',
        createdAt: 'Дата создания',
        actions: 'Действия',
        index: {
          title: 'Метки',
          create: 'Создать метку',
          empty: 'Меток пока нет',
        },
        new: {
          title: 'Создание метки',
          submit: 'Создать',
        },
        edit: {
          title: 'Изменение метки',
          submit: 'Сохранить',
        },
        delete: {
          submit: 'Удалить',
        },
      },
    },
  },
};