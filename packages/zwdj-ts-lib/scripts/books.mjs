// 书目配置：来源文件（react-zwds/docs/kb 的文件名前缀）→ 书。defaultSplit 0 表示一份文件就是一篇；
// split 里标 2 / 3 的文件按二级 / 三级标题切分。
export const CORPUS = {
  id: 'zwdj',
  system: 'ziwei',
  title: '紫微斗数典籍',
  sourceRepo: 'react-zwds',
  rights:
    '《紫微斗数全书》为明清传本，公有领域。卷一 01~14 篇整理自 ncc.com.tw 紫微古文汇编，15~20 篇与卷二、卷三的录入与标点取自维基文库（CC BY-SA 4.0）。卷一为繁体（15~20 篇经维基文库繁体转换），卷二、卷三为简体整理本，均照录；未经逐字校勘，个别字有讹。',
  excluded: [
    { file: '23-续道藏本紫微斗数-十八飞星.md', reason: '十八飞星体系，星曜与安星法都与《全书》十四主星不同，接入检索容易被当作同一体系引用，故不收' },
  ],
};

const WS = 'https://zh.wikisource.org/wiki/紫微斗數全書/';
const two = (n) => `${String(n).padStart(2, '0')}-`;

export const BOOKS = [
  {
    id: 'qs1', files: Array.from({ length: 20 }, (_, i) => two(i + 1)), defaultSplit: 0, split: { '15-': 3 }, groupByFile: true, minEntries: 56,
    title: '紫微斗數全書·卷一賦文', workTitle: '紫微斗數全書', author: '題陳希夷撰，羅洪先編', dynasty: '明', script: '繁',
    edition: '卷一二十篇：01~14 據 ncc.com.tw 紫微古文彙編，15~20 據維基文庫（繁體轉換）',
    // 01~14 没有可逐篇引用的网页地址，留空；15~20 指向维基文库卷一
    sourceUrlByFile: Object.fromEntries([15, 16, 17, 18, 19, 20].map((n) => [two(n), `${WS}卷一`])),
    summary: '星垣論、骨髓賦、紫微諸星廟陷訣、準繩賦、賦性論、十喻歌、女命賦、太微賦總括、合婚法、玄微論、玉蟾發微論、百字千金訣、形性賦、太虛觀微賦、諸星問答論（逐星三十七節）、增補太微賦、重補斗數彀率、定富貴貧賤十等論、十二宮諸星得地合格訣與失陷破格訣。',
  },
  {
    id: 'qs2', files: ['21-'], minEntries: 13,
    title: '紫微斗数全书·卷二', workTitle: '紫微斗數全書', author: '题陈希夷撰，罗洪先编', dynasty: '明', script: '简',
    edition: '维基文库简体整理本', sourceUrl: `${WS}卷二`,
    summary: '安身命例与诸星安法口诀；诸星入命宫的星情、各宫位喜忌及入男命、女命、入限吉凶诀；兄弟、妻妾、子女、财帛、疾厄、迁移、奴仆、官禄、田宅、福德、父母十一宫的诸星断语。',
  },
  {
    id: 'qs3', files: ['22-'], minEntries: 20,
    title: '紫微斗数全书·卷三', workTitle: '紫微斗數全書', author: '题陈希夷撰，罗洪先编', dynasty: '明', script: '简',
    edition: '维基文库简体整理本', sourceUrl: `${WS}卷三`,
    summary: '谈星要论、论人命入格、论格星数高下、论男女命同异、论小儿命、定小儿生时诀、论人生时要审的确、论大限十年祸福、论二限太岁吉凶、论流年太岁吉凶星杀、论诸星同垣各司所宜等二十篇。',
  },
];
