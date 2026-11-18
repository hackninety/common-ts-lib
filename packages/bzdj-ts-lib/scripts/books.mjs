// 书目配置：来源文件（react-8char/docs/kb 的文件名前缀）→ 书。篇目按 Markdown 的二级标题切分，
// split 里标 3 的文件按三级标题切分（二级标题记作卷名/大类）。
export const CORPUS = {
  id: 'bzdj',
  system: 'bazi',
  title: '八字子平典籍',
  sourceRepo: 'react-8char',
  rights:
    '原著均为清代及以前古籍，公有领域。《滴天髓》《渊海子平》《三命通会》《滴天髓阐微》的录入与标点取自维基文库（CC BY-SA 4.0），各篇带来源页地址；《子平真诠》取自 archive.org 公版书文本，并以殆知阁文本逐章比对。各录入本未经逐字校勘，个别字有讹，照录未改。',
  excluded: [
    { file: '08-定时辰古诀.md', reason: '出自《紫微斗数全书》卷三，已收入 zwdj-ts-lib，不在八字库重复收录' },
  ],
};

const WS = 'https://zh.wikisource.org/wiki/';

export const BOOKS = [
  {
    id: 'dts', files: ['01-'], minEntries: 42,
    title: '滴天髓（輯要本）', workTitle: '滴天髓', author: '題劉基撰，陳之遴輯', dynasty: '明／清', script: '繁',
    edition: '《滴天髓輯要》本，維基文庫錄入', sourceUrl: `${WS}滴天髓`,
    summary: '全文四十二章，自通天、天干、地支至性情、疾病、六親、貞元。粗體為正文，其下為原注。',
  },
  {
    id: 'dtscw', files: ['06-'], split: { '06-': 3 }, minEntries: 60,
    title: '滴天髓阐微', workTitle: '滴天髓闡微', author: '任铁樵注', dynasty: '清', script: '简',
    edition: '维基文库简体整理本', sourceUrl: `${WS}滴天髓闡微`,
    summary: '通神论三十四章、六亲论二十九章。每章先《滴天髓》正文，次原注（括注），次「任氏曰」疏解，后附命例与评断；命例排作「四柱 ／ 大运」一行。与輯要本章次、字句互有出入。',
  },
  {
    id: 'zpzq', files: ['05-'], minEntries: 47,
    title: '子平真诠', workTitle: '子平真詮', author: '沈孝瞻', dynasty: '清', script: '简',
    edition: 'archive.org 公版书简体整理本，以殆知阁《子平真诠评注》逐章比对', sourceUrl: 'https://archive.org/details/fanqienovel-7332316490827353150',
    summary: '原著四十七章，不含徐乐吾评注：十干十二支、阴阳生克、用神及其成败变化、相神、杂气、行运、宫分六亲，至八格各论与取运、杂格。',
  },
  {
    id: 'yhzp', files: ['02-'], minEntries: 17,
    title: '渊海子平（性情十神诸篇）', workTitle: '淵海子平', author: '徐子平法，唐锦池刊', dynasty: '宋／明', script: '简',
    edition: '维基文库简体整理本，节选', sourceUrl: `${WS}淵海子平`,
    summary: '节选十七节：论性情（含干支体象诗）、论疾病、论小儿、十神诸篇（伤官、食神、正财、正官、七杀、印绶、倒食、劫财、阳刃、日刃）与相心赋。',
  },
  {
    id: 'smth', files: ['03-'], minEntries: 18,
    title: '三命通会（性情十神诸论）', workTitle: '三命通會', author: '万民英', dynasty: '明', script: '简',
    edition: '维基文库简体整理本，节选；论性情相貌并录四库全书本（繁体无标点）', sourceUrl: `${WS}三命通會`,
    summary: '节选卷七论性情相貌、论疾病、论小儿，卷五卷六十神诸论（正官、偏官、正财、偏财、印绶、倒食、伤官、食神、阳刃、建禄），卷三驿马、学堂词馆、羊刃。',
  },
  {
    id: 'smth-rishi', files: ['04-'], minEntries: 120,
    title: '三命通会·六十日时断', workTitle: '三命通會', author: '万民英', dynasty: '明', script: '简',
    edition: '维基文库简体整理本，卷八、卷九全文', sourceUrl: `${WS}三命通會`,
    summary: '十日干各配十二时，共一百二十条「六X日X时断」：歌诀、总论、六个日柱分述。录入本个别干支有讹，以条目标题为准。',
  },
  {
    id: 'smth-siku', files: ['07-'], split: { '07-': 3 }, minEntries: 25,
    title: '三命通會（四庫全書本）卷十至卷十二', workTitle: '三命通會', author: '萬民英', dynasty: '明', script: '繁',
    edition: '四庫全書本，繁體無標點，維基文庫錄入', sourceUrl: `${WS}三命通會_(四庫全書本)`,
    summary: '看命口訣、巫咸撮要、玉井奥訣、氣象篇、六神篇、憎愛賦、消息賦、明通賦、喜忌篇、繼善篇、元理賦、真寳賦、金聲玉振賦、絡繹賦、金玉賦、心鏡五七賦、人鑑論、四言獨步等。粗體為賦文正句，其後為注；缺字以「□」占位。',
  },
];
