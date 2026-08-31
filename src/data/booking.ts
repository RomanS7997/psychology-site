// Контексты записи.
//
// Каждая кнопка «Записаться» на сайте говорит форме, куда именно записывается
// человек. Форма от этого меняется: заголовок, карточка с условиями слева,
// набор полей и тема письма. Раньше все 30 кнопок открывали одну безликую
// форму, и оператору приходилось угадывать, откуда пришла заявка.

export type BookingField = 'name' | 'childName' | 'childAge' | 'phone' | 'email' | 'comment';

export interface BookingContext {
  /** Надзаголовок над названием */
  eyebrow: string;
  /** Заголовок окна */
  title: string;
  /** Строка под заголовком */
  lede: string;
  /** Что показываем в карточке слева: условия услуги */
  facts: { label: string; value: string }[];
  /** Поля формы в порядке отображения */
  fields: BookingField[];
  /** Тема письма — по ней видно, откуда заявка */
  subject: string;
  /** Подпись кнопки отправки */
  submit: string;
  /** Название услуги в письме */
  service: string;
}

const CHILD_FIELDS: BookingField[] = ['name', 'phone', 'childName', 'childAge', 'email', 'comment'];
const ADULT_FIELDS: BookingField[] = ['name', 'phone', 'email', 'comment'];

export const BOOKING_CONTEXTS: Record<string, BookingContext> = {
  // ---------- Общая, если кнопка не указала контекст ----------
  default: {
    eyebrow: 'Запись',
    title: 'Записаться на приём',
    lede: 'Оставьте контакты — свяжемся, чтобы подобрать удобное время.',
    facts: [
      { label: 'Ответим', value: 'В течение дня' },
      { label: 'Формат', value: 'Онлайн или в кабинете' },
      { label: 'Кабинет', value: 'Одинцово, Лесной городок' },
    ],
    fields: ADULT_FIELDS,
    subject: 'Заявка с сайта — запись',
    submit: 'Отправить заявку',
    service: 'Приём у психолога',
  },

  // ---------- Взрослые ----------
  adult: {
    eyebrow: 'Услуга',
    title: 'Запись на консультацию',
    lede: 'Первая встреча — знакомство и разбор запроса. Ничего готовить заранее не нужно.',
    facts: [
      { label: 'Длительность', value: '55 минут' },
      { label: 'Стоимость', value: '6000 ₽' },
      { label: 'Формат', value: 'Онлайн или в кабинете' },
    ],
    fields: ADULT_FIELDS,
    subject: 'Заявка: консультация для взрослых',
    submit: 'Записаться на консультацию',
    service: 'Консультация для взрослых',
  },

  lila: {
    eyebrow: 'Услуга',
    title: 'Запись на игру',
    lede: 'Расскажите в двух словах о запросе — с ним и будем работать в игре.',
    facts: [
      { label: 'Формат', value: 'Игра-медитация' },
      { label: 'С чем работаем', value: 'С вашим запросом' },
      { label: 'Место', value: 'Кабинет в Лесном городке' },
    ],
    fields: ADULT_FIELDS,
    subject: 'Заявка: трансформационная игра «Лила»',
    submit: 'Записаться на игру',
    service: 'Трансформационная игра «Лила»',
  },

  // ---------- Дети ----------
  children: {
    eyebrow: 'Услуга',
    title: 'Запись на занятие',
    lede: 'Начинаем со встречи с родителем: обсуждаем запрос и подбираем формат.',
    facts: [
      { label: 'Возраст', value: 'От 3 лет' },
      { label: 'Первая встреча', value: 'С родителем' },
      { label: 'Формат', value: 'Онлайн или в кабинете' },
    ],
    fields: CHILD_FIELDS,
    subject: 'Заявка: занятия с ребёнком',
    submit: 'Записать ребёнка',
    service: 'Занятия с ребёнком',
  },

  single: {
    eyebrow: 'Формат',
    title: 'Запись на консультацию',
    lede: 'Одна встреча: обсуждаем запрос, при необходимости — диагностика и рекомендации.',
    facts: [
      { label: 'Формат', value: 'Одна встреча' },
      { label: 'Что входит', value: 'Разбор запроса и рекомендации' },
      { label: 'Где', value: 'Онлайн или в кабинете' },
    ],
    fields: CHILD_FIELDS,
    subject: 'Заявка: разовая консультация для ребёнка',
    submit: 'Записаться',
    service: 'Разовая консультация',
  },

  package: {
    eyebrow: 'Формат',
    title: 'Запись на системную работу',
    lede: 'Серия встреч по плану терапии. Первая встреча — знакомство и план.',
    facts: [
      { label: 'Формат', value: 'Серия встреч' },
      { label: 'Что входит', value: 'Индивидуальный план работы' },
      { label: 'Начинаем', value: 'Со встречи с родителем' },
    ],
    fields: CHILD_FIELDS,
    subject: 'Заявка: системная работа с ребёнком',
    submit: 'Записаться',
    service: 'Системная работа',
  },

  group: {
    eyebrow: 'Формат',
    title: 'Запись в группу',
    lede: 'Расскажем о ближайшем наборе и подберём группу по возрасту.',
    facts: [
      { label: 'Группа', value: 'До 8 человек' },
      { label: 'Частота', value: '1 раз в неделю' },
      { label: 'Что развиваем', value: 'Социальные навыки' },
    ],
    fields: CHILD_FIELDS,
    subject: 'Заявка: групповые занятия',
    submit: 'Записаться в группу',
    service: 'Групповые занятия',
  },

  'school-prep': {
    eyebrow: 'Программа',
    title: 'Запись на подготовку',
    lede: 'Расскажем о программе и подберём группу под возраст ребёнка.',
    facts: [
      { label: 'Возраст', value: '6–7 лет' },
      { label: 'Занятия', value: '2 раза в неделю' },
      { label: 'Что даём', value: 'Знания и готовность к школе' },
    ],
    fields: CHILD_FIELDS,
    subject: 'Заявка: подготовка к школе',
    submit: 'Записаться на программу',
    service: 'Подготовка к школе',
  },

  trial: {
    eyebrow: 'Знакомство',
    title: 'Запись на пробное занятие',
    lede: 'Бесплатно и ни к чему не обязывает — посмотрите, как проходят занятия.',
    facts: [
      { label: 'Стоимость', value: 'Бесплатно' },
      { label: 'Формат', value: 'Обычное занятие в группе' },
      { label: 'После', value: 'Обратная связь родителю' },
    ],
    fields: CHILD_FIELDS,
    subject: 'Заявка: бесплатное пробное занятие',
    submit: 'Записаться на пробное',
    service: 'Пробное занятие',
  },

  umniky: {
    eyebrow: 'Программа',
    title: 'Запись на программу',
    lede: 'Ежедневные занятия по подготовке к школе. Расскажем о ближайшем наборе.',
    facts: [
      { label: 'Возраст', value: '4–6 лет' },
      { label: 'Расписание', value: 'Будни, 9:00–13:00' },
      { label: 'Группа', value: 'До 8 детей' },
    ],
    fields: CHILD_FIELDS,
    subject: 'Заявка: программа «Умники и умницы»',
    submit: 'Записаться на программу',
    service: '«Умники и умницы»',
  },

  azbuka: {
    eyebrow: 'Программа',
    title: 'Запись на программу',
    lede: 'Курс о чувствах, границах и общении. Расскажем о ближайшем наборе.',
    facts: [
      { label: 'Возраст', value: '5–9 лет' },
      { label: 'Занятие', value: '60 минут, раз в неделю' },
      { label: 'Группа', value: 'До 8 детей' },
    ],
    fields: CHILD_FIELDS,
    subject: 'Заявка: программа «Азбука общения»',
    submit: 'Записаться на программу',
    service: '«Азбука общения»',
  },
};

/** Запись к конкретному специалисту: контекст собирается на лету. */
export function specialistContext(name: string, role: string, kids: boolean): BookingContext {
  return {
    eyebrow: 'Запись к специалисту',
    title: name,
    lede: `${role}. Оставьте контакты — согласуем удобное время.`,
    facts: [
      { label: 'Специалист', value: name },
      { label: 'Направление', value: role },
      { label: 'Формат', value: kids ? 'Занятия с ребёнком' : 'Онлайн или в кабинете' },
    ],
    fields: kids ? CHILD_FIELDS : ADULT_FIELDS,
    subject: `Заявка: запись к специалисту — ${name}`,
    submit: 'Записаться',
    service: name,
  };
}

export const FIELD_LABELS: Record<BookingField, { label: string; placeholder: string; required: boolean; type: string }> = {
  name: { label: 'Ваше имя', placeholder: 'Как к вам обращаться', required: true, type: 'text' },
  childName: { label: 'Имя ребёнка', placeholder: 'Необязательно', required: false, type: 'text' },
  childAge: { label: 'Возраст ребёнка', placeholder: 'Например, 5 лет', required: false, type: 'text' },
  phone: { label: 'Телефон', placeholder: '+7 (___) ___-__-__', required: true, type: 'tel' },
  email: { label: 'Email', placeholder: 'Необязательно', required: false, type: 'email' },
  comment: { label: 'Что вас беспокоит', placeholder: 'Пара слов о ситуации — необязательно', required: false, type: 'textarea' },
};

/**
 * Раздел сайта → контекст записи. Нужен кнопкам, которые стоят на каждой
 * странице (шапка, плавающая кнопка): на странице программы такая кнопка
 * должна открывать запись на эту программу, а не безликую форму.
 */
export function contextForPath(pathname: string): string {
  const p = pathname.replace(/\/+$/, '');
  if (p.endsWith('/services/adult')) return 'adult';
  if (p.endsWith('/services/children')) return 'children';
  if (p.endsWith('/services/lila')) return 'lila';
  if (p.endsWith('/services/school-prep')) return 'school-prep';
  if (p.endsWith('/programs/umniky')) return 'umniky';
  if (p.endsWith('/programs/azbuka')) return 'azbuka';
  return 'default';
}
