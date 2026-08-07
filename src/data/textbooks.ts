// 电子课本链接配置
// 3-9年级：人教版RJ课本（renjiaoshe.com 直链，打开即是课本内容）
// 10-12年级：人教版2019新课标（国家中小学智慧教育平台，直链课本内容）

export interface TextbookInfo {
  url: string
  name: string
  description: string
}

// 按年级映射电子课本（直接打开课本内容的链接）
export const TEXTBOOKS: Record<number, TextbookInfo> = {
  // 小学 PEP 三年级起点 (2019新版) - 直链课本内容
  3: {
    url: 'http://www.renjiaoshe.com/dianzikeben/yy3s.html',
    name: '三年级英语上册（PEP三起点）',
    description: '人教版PEP三年级起点',
  },
  4: {
    url: 'http://www.renjiaoshe.com/dianzikeben/yy4s.html',
    name: '四年级英语上册（PEP三起点）',
    description: '人教版PEP三年级起点',
  },
  5: {
    url: 'http://www.renjiaoshe.com/dianzikeben/yy5s.html',
    name: '五年级英语上册（PEP三起点）',
    description: '人教版PEP三年级起点',
  },
  6: {
    url: 'http://www.renjiaoshe.com/dianzikeben/yy6s.html',
    name: '六年级英语上册（PEP三起点）',
    description: '人教版PEP三年级起点',
  },
  // 初中 Go for it! (2019新版) - 直链课本内容
  7: {
    url: 'http://www.renjiaoshe.com/dianzikeben/yy7s.html',
    name: '七年级英语上册（Go for it!）',
    description: '人教版新目标英语',
  },
  8: {
    url: 'http://www.renjiaoshe.com/dianzikeben/yy8s.html',
    name: '八年级英语上册（Go for it!）',
    description: '人教版新目标英语',
  },
  9: {
    url: 'http://www.renjiaoshe.com/dianzikeben/yy9.html',
    name: '九年级英语全一册（Go for it!）',
    description: '人教版新目标英语',
  },
  // 高中 新课标 (2019新版) - 国家中小学智慧教育平台直链
  10: {
    url: 'https://basic.smartedu.cn/tchMaterial/detail?contentType=assets_document&contentId=8e62f140-1990-411e-8831-59a69bb53c1d&catalogType=tchMaterial&subCatalog=tchMaterial',
    name: '高中英语 必修第一册',
    description: '人教版2019新课标',
  },
  11: {
    url: 'https://basic.smartedu.cn/tchMaterial/detail?contentType=assets_document&contentId=5fb3b605-f325-4cba-88e8-cb7d9f8e5872&catalogType=tchMaterial&subCatalog=tchMaterial',
    name: '高中英语 必修第二册',
    description: '人教版2019新课标',
  },
  12: {
    url: 'https://basic.smartedu.cn/tchMaterial/detail?contentType=assets_document&contentId=ca0b7687-6c4b-43ac-9b3e-3e6f1e6c0e22&catalogType=tchMaterial&subCatalog=tchMaterial',
    name: '高中英语 选择性必修',
    description: '人教版2019新课标',
  },
}

// 获取指定年级的电子课本信息
export function getTextbook(grade: number): TextbookInfo | undefined {
  return TEXTBOOKS[grade]
}
