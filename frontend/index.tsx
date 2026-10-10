import { definePlugin, Field } from 'millennium';
export default definePlugin(() => ({
  title: 'Steam × GGSEL',
  icon: <span aria-hidden="true">G</span>,
  content: <Field label="Предложения сторонней площадки GGSEL в магазине Steam. Каталог и издания проверяются по точному названию; неизвестные совпадения скрываются. Условия, регион и итоговую цену проверяйте на GGSEL." />,
}));
