import { Model, snakeCaseMappers } from 'objection';
import objectionUnique from 'objection-unique';
import crypto from 'crypto';

const unique = objectionUnique({ fields: ['email'] });

const generateDigest = (password) => crypto
  .createHash('sha256')
  .update(password)
  .digest('hex');

export default class User extends unique(Model) {
  static get tableName() {
    return 'users';
  }

  // Этот метод маппит firstName <-> first_name автоматически!
  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['firstName', 'lastName', 'email', 'password'],
      properties: {
        id: { type: 'integer' },
        firstName: { type: 'string', minLength: 1 },
        lastName: { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 3 },
      },
    };
  }

  $beforeInsert() {
    this.passwordDigest = generateDigest(this.password);
    // Поле password удалять не нужно, маппер сам разберется, 
    // а валидация Objection ожидает его во время проверки
        // Удаляем свойство password, чтобы оно не отправлялось в SQL-запрос
    delete this.password; 
  }
}
