// Reviewed birth-only excerpts. Original notes remain byte-for-byte in the answer chunks.
// Do not automatically expose person.notes: they may contain answers or life events.
const publicNotes = {
  'contest8_2022/male_19740428_P017': '原文只写「美国当地时间」，未写州或时区。',
  'contest8_2022/male_19850629_P021': '转载站原文未写出生地；知乎转载写「出生地点：马来西亚」。',
  'contest8_2023/male_19620806_P010': '上游整理说明：「香港出生」写在命题提供者一行，上游按命主出生地处理。',
  'contest8_2024/male_19611230_P003': '原文未写出生地。',
  'contest8_2025/miyazaki_male_19830421_P003': '原文为「上午 6-7 时」，time 取区间中点。',
  'contest8_2026/2026_C4_male_19511105': '原文为「上午 5-6 点」，time 取区间中点。',
  'hkjfma_2012/2012_C1_female_19791005': '出生地原文未写。',
  'hkjfma_2017/2017_C7a_female_19510124': '原文只给出零时至1时的区间，time 取区间中点。',
  'hkjfma_2017/2017_C7b_female_19510124': '原文只给出23时至24时的区间，time 取区间中点；是否按夜子时换日由使用者决定。',
  'hkjfma_2018/2018_C5_female_19401013': '官网原文漏印此命例的出生资料（2018-06 Wayback 存档同样缺）；上游生辰取自转载站 ziweicn.com/show/3487.html。',
  'hkjfma_2019/2019_C2_male_19870710': '原图未写出生地。',
};
export function birthMetadata(collectionId, person) {
  const birth = person.profile.birth;
  const note = publicNotes[collectionId + '/' + person.person_id];
  const birthNotes = note ? [note] : [];
  let timePrecision = birth.hour == null ? 'unknown'
    : /[子丑寅卯辰巳午未申酉戌亥][时時]/.test(birth.time_raw ?? '') ? 'branch'
    : birth.approximate === true ? 'approximate-clock' : 'minute';
  if (note?.includes('区间中点')) timePrecision = 'interval-midpoint';
  if (collectionId === 'celebrity50_zh' && birth.hour === 12 && birth.minute === 0) {
    timePrecision = 'unverified-clock';
    birthNotes.push('本库精度审计：该名人资料集有44例统一记为12:00，未找到这些钟点的精确时刻依据，不能当作已核实出生时间；保留上游数值，不认定上游已声明占位。');
  }
  return { timePrecision, birthNotes };
}
