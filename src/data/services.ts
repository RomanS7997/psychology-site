// Услуги кабинета — одна таблица для разметки, страницы «Услуги» и блоков
// «Смотрите также».
//
// Названия и подписи здесь не придуманы: name — заголовок самой страницы,
// title и note — то, что стоит в меню, text — подпись, которой страница уже
// была представлена на соседних. Возраст указан только там, где он назван
// на странице услуги.

export interface Service {
  path: string;
  /** Как услуга названа на своей странице (заголовок H1) */
  name: string;
  /** Короткое название из меню */
  title: string;
  /** Подпись из меню */
  note: string;
  /** Подпись для карточки «Смотрите также» */
  text: string;
  /** Вид услуги для разметки: «Подготовка к школе», а не общее «консультирование» */
  type: string;
  icon: string;
  audience?: { min?: number; max?: number };
  /** Фото первого экрана страницы — для разметки */
  image?: string;
  group: 'adult' | 'children';
}

export const services: Service[] = [
  {
    path: '/services/adult',
    name: 'Психологическое консультирование для взрослых',
    title: 'Консультирование взрослых',
    note: 'Индивидуальная психологическая помощь',
    text: 'Индивидуальная психологическая помощь — в кабинете и онлайн',
    type: 'Психологическое консультирование',
    icon: 'psychology',
    image: '/images/services/adult-consulting.jpg',
    group: 'adult',
  },
  {
    path: '/services/children',
    name: 'Индивидуальные занятия с детьми',
    title: 'Индивидуальные занятия с детьми',
    note: 'Работа с эмоциями, страхами, поведением',
    text: 'Помощь детям и подросткам в развитии и преодолении трудностей',
    type: 'Детский психолог',
    icon: 'children',
    audience: { min: 5, max: 18 },
    image: '/images/services/child-therapy.jpg',
    group: 'children',
  },
  {
    path: '/services/lila',
    name: 'Трансформационная игра «Лила»',
    title: 'Трансформационная игра «Лила»',
    note: 'Игра-медитация для работы с запросом',
    text: 'Игра-медитация: взгляд на свой запрос с новой стороны',
    type: 'Трансформационная игра',
    icon: 'lila-game',
    group: 'adult',
  },
  {
    path: '/services/school-prep',
    name: 'Подготовка к школе',
    title: 'Подготовка к школе',
    note: 'Занятия 2 раза в неделю для будущих первоклассников',
    text: 'Знания и навыки для успешного старта в школе',
    type: 'Подготовка к школе',
    icon: 'school-readiness',
    audience: { min: 6, max: 7 },
    image: '/images/services/school-prep.jpg',
    group: 'children',
  },
  {
    path: '/programs/umniky',
    name: 'Развивающая программа «Умники и умницы»',
    title: 'Умники и умницы',
    note: 'Ежедневные комплексно-развивающие занятия 4–6 лет',
    text: 'Комплексно-развивающие занятия для детей 4–6 лет',
    type: 'Развивающие занятия для дошкольников',
    icon: 'program-umniky',
    audience: { min: 4, max: 6 },
    image: '/images/gallery/umniky/2.jpg',
    group: 'children',
  },
  {
    path: '/programs/azbuka',
    name: 'Психологический курс «Азбука общения»',
    title: 'Азбука общения',
    note: 'Курс эмоционального интеллекта для детей 5–9 лет',
    text: 'Развитие эмоционального интеллекта для детей 5–9 лет',
    type: 'Развитие эмоционального интеллекта у детей',
    icon: 'program-azbuka',
    audience: { min: 5, max: 9 },
    image: '/images/gallery/azbuka/5.jpg',
    group: 'children',
  },
];

export const serviceByPath = (path: string) =>
  services.find((service) => service.path === path.replace(/\/$/, ''));

/** Карточка для блока «Смотрите также» */
export const serviceCard = (path: string) => {
  const service = serviceByPath(path);
  if (!service) throw new Error(`Нет такой услуги: ${path}`);
  return { icon: service.icon, title: service.title, text: service.text, href: service.path };
};
