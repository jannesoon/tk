let currentEditingProductId = null; // 用于追踪正在编辑的商品ID
let currentEditingFoodId = null;
let logisticsUpdateTimers = [];
let isSelectionMode = false;
let notificationTimeout;
let imageGenerationQueue = []; // 全局的图片生成任务队列
let isProcessingImage = false; // 一个开关，防止队列被重复处理
// 物流时间线模板 (delay单位是毫秒)
// 你可以随意修改这里的文本和延迟时间，打造你自己的物流故事！
const logisticsTimelineTemplate = [
  { text: '您的订单已提交', delay: 1000 * 2 }, // 2秒
  { text: '付款成功，等待商家打包', delay: 1000 * 10 }, // 10秒后
  { text: '【{city}仓库】已打包，等待快递揽收', delay: 1000 * 60 * 5 }, // 5分钟后
  { text: '【{city}快递】已揽收', delay: 1000 * 60 * 20 }, // 20分钟后
  { text: '快件已到达【{city}分拨中心】', delay: 1000 * 60 * 60 * 2 }, // 2小时后
  { text: '【{city}分拨中心】已发出，下一站【{next_city}】', delay: 1000 * 60 * 60 * 8 }, // 8小时后
  { text: '快件已到达【{user_city}转运中心】', delay: 1000 * 60 * 60 * 20 }, // 20小时后
  { text: '快件正在派送中，派送员：兔兔快递员，电话：123-4567-8910，请保持电话畅通', delay: 1000 * 60 * 60 * 24 }, // 24小时后
  { text: '您的快件已签收，感谢您在桃宝购物，期待再次为您服务！', delay: 1000 * 60 * 60 * 28 }, // 28小时后
];

// ▼▼▼ 在这里粘贴下面的新代码 ▼▼▼
const addProductChoiceModal = document.getElementById('add-product-choice-modal');
const aiGeneratedProductsModal = document.getElementById('ai-generated-products-modal');
const productSearchInput = document.getElementById('product-search-input');
const productSearchBtn = document.getElementById('product-search-btn');
const STICKER_REGEX =
  /^(https:\/\/i\.postimg\.cc\/.+|https:\/\/i\.ibb\.co\/.+|https:\/\/files\.catbox\.moe\/.+|data:image)/;
// ▼▼▼ 在这里粘贴下面这整块新代码 ▼▼▼

// ▼▼▼ 用这块【新代码】替换旧的 GENERIC_PRODUCT_PROMPTS 数组 ▼▼▼

// ▼▼▼ 用这块【新代码】替换旧的 GENERIC_PRODUCT_PROMPTS 数组 ▼▼▼

// 全局的、通用的商品图片提示词模板库
// 我们会根据商品名称的关键词来智能匹配这些模板
const GENERIC_PRODUCT_PROMPTS = [
  {
    keywords: ['衣', '裙', '裤', 'T恤', '衬衫', '外套', '卫衣', '毛衣', '服', '装'],
    englishCategory: 'a piece of fashion clothing', // 新增的英文品类名
    prompt:
      'A piece of modern clothing, {productName}, elegantly displayed on a mannequin or lying flat, clean minimalist studio shot, professional product photography, soft shadows, solid color background, high detail, photorealistic, 8k',
  },
  {
    keywords: ['鞋', '靴', 'sneaker', 'boot'],
    englishCategory: 'a modern sneaker',
    prompt:
      'A single modern shoe, {productName}, studio product shot, minimalist, on a solid color platform, detailed, photorealistic, commercial photography, soft studio lighting',
  },
  {
    keywords: ['包', '袋', 'backpack', 'handbag'],
    englishCategory: 'a stylish modern bag',
    prompt:
      'A stylish modern bag, {productName}, professional product photography, minimalist, clean background, studio lighting, high fashion, high detail, 8k, hyperrealistic',
  },
  {
    keywords: ['手机', '耳机', '键盘', '鼠标', '数据线', '充电', '数码', '电子'],
    englishCategory: 'a sleek electronic gadget',
    prompt:
      'A sleek electronic gadget, {productName}, on a clean modern desk, minimalist product shot, tech aesthetic, studio lighting, photorealistic, octane render, 8k',
  },
  {
    keywords: [
      '零食',
      '饼干',
      '薯片',
      '糖',
      '巧克力',
      '水',
      '饮料',
      '茶',
      '咖啡',
      'food',
      'snack',
      '面',
      '饭',
      '汉堡',
      '奶茶',
    ],
    englishCategory: 'a delicious-looking food or drink product',
    prompt:
      'Delicious-looking {productName}, professional product shot, appetizing, packaging or food itself displayed, minimalist setup, vibrant colors, solid color background, high detail, food photography',
  },
  {
    keywords: ['杯', '碗', '盘', '锅', '灯', '毯', '枕', '家居', '摆件', '装饰'],
    englishCategory: 'a modern home decor item',
    prompt:
      'A modern home decor item, {productName}, in a cozy and minimalist living room setting, soft lighting, professional product shot, high detail, photorealistic, interior design magazine style',
  },
  {
    keywords: ['化妆', '护肤', '口红', '眼影', '香水', '面膜'],
    englishCategory: 'a cosmetic product package',
    prompt:
      'A bottle or package of a cosmetic product, {productName}, clean product shot, on a podium with simple geometric shapes, minimalist, beauty photography, high detail, solid color background, soft shadows',
  },
  {
    keywords: ['玩具', '玩偶', '模型', '手办', 'toy', 'figure'],
    englishCategory: 'a cute or cool toy figure',
    prompt:
      'A cute or cool toy figure, {productName}, product shot, on a simple stand, plain background, studio lighting, detailed, collectible, anime style, 8k',
  },
  {
    keywords: ['书', '本', '笔', '文具'],
    englishCategory: 'a book or stationery item',
    prompt:
      'A book or stationery item, {productName}, neatly arranged on a clean desk, minimalist, flat lay photography, high detail, studio lighting, soft shadows',
  },
  {
    // 这是默认的备用模板，如果上面的关键词都匹配不上，就用这个
    keywords: [],
    englishCategory: 'a modern product', // 默认的英文品类名
    // ★★★ 全面优化的备用提示词 ★★★
    prompt:
      'Commercial product photography of {productName}. Professional studio shot, clean minimalist aesthetic, displayed on a podium or flat surface. Soft, even lighting, subtle soft shadows. Shot on a high-end camera, 8k, hyperrealistic, high detail.',
  },
];

// ▲▲▲ 替换结束 ▲▲▲
/**
 * 【全新】顺序处理图片生成队列
 * 这个函数会一个接一个地为队列中的商品/美食生成图片，避免并发请求。
 */
async function processImageQueue() {
  // 如果当前有其他任务正在处理，就直接返回，让它处理完再说
  if (isProcessingImage) return;

  // 标记为“正在处理中”，锁上开关
  isProcessingImage = true;
  console.log(`队列开始处理，当前有 ${imageGenerationQueue.length} 个图片生成任务。`);

  // 只要队列里还有任务，就一直循环
  while (imageGenerationQueue.length > 0) {
    // 从队列的头部取出一个任务
    const task = imageGenerationQueue.shift();

    console.log(`正在为 "${task.item.name}" 生成图片...`);

    try {
      // 根据任务类型，调用对应的图片处理函数
      // 这里我们等待 (await) 每个图片生成函数执行完毕
      if (task.type === 'taobao') {
        await processProductImage(task.item);
      } else if (task.type === 'eleme') {
        await processFoodImage(task.item);
      }
    } catch (error) {
      // 即使单个任务失败，也要打印错误并继续处理下一个任务
      console.error(`生成 "${task.item.name}" 的图片时发生意外错误:`, error);
    }
  }

  // 所有任务都处理完了，标记为“已完成”，解开开关，等待下一次任务
  isProcessingImage = false;
  console.log('图片生成队列已处理完毕。');
}

// ▲▲▲ 新代码粘贴结束 ▲▲▲
// ▼▼▼ 用这块【新代码】替换旧的 selectGenericImagePrompt 函数 ▼▼▼

/**
 * 【V2 | 英文转译版】根据商品名智能选择一个通用的图片提示词
 * @param {string} productName - 商品的中文名
 * @returns {string} - 拼接好的、纯英文的提示词
 */
function selectGenericImagePrompt(productName) {
  const lowerCaseName = productName.toLowerCase();

  let matchedTemplate = null;

  // 1. 寻找最匹配的模板
  for (const template of GENERIC_PRODUCT_PROMPTS) {
    if (template.keywords.length > 0 && template.keywords.some(kw => lowerCaseName.includes(kw))) {
      matchedTemplate = template;
      break; // 找到第一个匹配的就跳出循环
    }
  }

  // 2. 如果没有找到匹配的，则使用默认的备用模板
  if (!matchedTemplate) {
    matchedTemplate = GENERIC_PRODUCT_PROMPTS[GENERIC_PRODUCT_PROMPTS.length - 1];
  }

  console.log(`为“${productName}”匹配到分类: ${matchedTemplate.englishCategory}`);

  // 3. 【核心修改】使用模板中预设的 "englishCategory" 替换占位符，而不是直接用中文名
  const finalPrompt = matchedTemplate.prompt.replace('{productName}', matchedTemplate.englishCategory);

  return finalPrompt;
}

// ▲▲▲ 替换结束 ▲▲▲

// ▼▼▼ 用这块【V2 | 无限重试版】代码替换旧的 generateAndLoadImage 函数 ▼▼▼
/**
 * 【V2 | 无限重试版】为Prompt生成并加载图片
 * @param {string} prompt - 用于生成图片的英文提示词
 * @returns {Promise<string>} - 返回一个Promise，它最终会resolve为一个有效的图片URL
 */
async function generateAndLoadImage(prompt) {
  while (true) {
    // ★★★ 核心修改：这是一个无限循环 ★★★
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const seed = Math.floor(Math.random() * 100000);

      // 尝试主域名
      const primaryUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=640&seed=${seed}`;

      const loadImage = url =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve(url);
          img.onerror = () => reject(new Error(`URL加载失败: ${url}`));
        });

      const imageUrl = await loadImage(primaryUrl).catch(async () => {
        console.warn(`主URL加载失败，尝试备用URL for: ${prompt}`);
        const fallbackUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=640&seed=${seed}`;
        return await loadImage(fallbackUrl);
      });

      // 如果任何一个URL成功加载，就返回结果，并跳出循环
      return imageUrl;
    } catch (error) {
      // 如果主域名和备用域名都失败了...
      console.error(`图片生成彻底失败，将在5秒后重试。错误: ${error.message}`);
      // 等待5秒钟，然后循环会继续，开始下一次尝试
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
// ▲▲▲ 替换结束 ▲▲▲

/**
 * 【V2 | 无限重试版】为Prompt生成并加载图片
 * @param {string} prompt - 用于生成图片的英文提示词
 * @returns {Promise<string>} - 返回一个Promise，它最终会resolve为一个有效的图片URL
 */
async function generateAndLoadImage(prompt) {
  while (true) {
    // ★★★ 核心修改：这是一个无限循环 ★★★
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const seed = Math.floor(Math.random() * 100000);

      // 尝试主域名
      const primaryUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=640&seed=${seed}`;

      const loadImage = url =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.src = url;
          img.onload = () => resolve(url);
          img.onerror = () => reject(new Error(`URL加载失败: ${url}`));
        });

      const imageUrl = await loadImage(primaryUrl).catch(async () => {
        console.warn(`主URL加载失败，尝试备用URL for: ${prompt}`);
        const fallbackUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=640&seed=${seed}`;
        return await loadImage(fallbackUrl);
      });

      // 如果任何一个URL成功加载，就返回结果，并跳出循环
      return imageUrl;
    } catch (error) {
      // 如果主域名和备用域名都失败了...
      console.error(`图片生成彻底失败，将在5秒后重试。错误: ${error.message}`);
      // 等待5秒钟，然后循环会继续，开始下一次尝试
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// ▼▼▼ 用这块【V2 | 智能决策版】代码，替换旧的 processProductImage 函数 ▼▼▼

/**
 * 【全新 | V2】异步处理单个商品图片的生成和保存
 * @param {object} product - 商品对象
 */
async function processProductImage(product) {
  try {
    // ★★★ 核心修改：智能决策，决定使用哪个提示词 ★★★
    let imagePrompt;
    if (product.imagePrompt && product.imagePrompt.trim() !== '') {
      // 如果这个商品数据中自带了专属的 imagePrompt (通常来自AI生成)，就优先使用它！
      imagePrompt = product.imagePrompt;
      console.log(`正在为桃宝商品“${product.name}”使用AI提供的专属提示词进行生图...`);
    } else {
      // 否则（比如是手动添加的、或者旧数据），就回退到通用模板匹配方案
      imagePrompt = selectGenericImagePrompt(product.name);
      console.log(`正在为桃宝商品“${product.name}”匹配通用提示词进行生图...`);
    }

    // 2. 调用我们那个“永不放弃”的核心生图函数
    const imageUrl = await generateAndLoadImage(imagePrompt);

    // 3. 将生成好的图片URL保存回“桃宝”的数据库，实现持久化
    await db.taobaoProducts.update(product.id, { imageUrl: imageUrl });

    // 4. 更新界面上对应卡片的显示，用图片替换加载动画
    const cardElement = document.querySelector(`.product-card[data-product-id="${product.id}"]`);
    if (cardElement) {
      const imageContainer = cardElement.querySelector('.product-image-container');
      if (imageContainer) {
        imageContainer.innerHTML = `<img src="${imageUrl}" class="product-image" alt="${product.name}">`;
      }
    }
  } catch (error) {
    console.error(`处理商品 "${product.name}" 图片时失败:`, error);
    const cardElement = document.querySelector(`.product-card[data-product-id="${product.id}"]`);
    if (cardElement) {
      const imageContainer = cardElement.querySelector('.product-image-container');
      if (imageContainer) {
        imageContainer.innerHTML = `<span>图片<br>加载失败</span>`;
      }
    }
  }
}

// ▲▲▲ 替换结束 ▲▲▲

// ▼▼▼ 用这块【V2 | 智能选择提示词版】新代码，替换旧的 processFoodImage 函数 ▼▼▼

/**
 * 【全新 | V2】异步处理单个美食图片的生成和保存
 * @param {object} food - 美食对象
 */
async function processFoodImage(food) {
  try {
    // 1. ★★★ 智能决策：决定使用哪个提示词 ★★★
    let imagePrompt;
    if (food.imagePrompt && food.imagePrompt.trim() !== '') {
      // 如果这个美食数据中自带了专属的 imagePrompt，就优先使用它！
      imagePrompt = food.imagePrompt;
      console.log(`正在为“${food.name}”使用AI提供的专属提示词进行生图...`);
    } else {
      // 否则（比如是手动添加的、或者旧数据），就回退到通用模板匹配方案
      imagePrompt = selectGenericImagePrompt(food.name);
      console.log(`正在为“${food.name}”匹配通用提示词进行生图...`);
    }

    // 2. 调用我们那个“永不放弃”的核心生图函数
    const imageUrl = await generateAndLoadImage(imagePrompt);

    // 3. 将生成好的图片URL保存回“饿了么”的数据库，实现持久化
    await db.elemeFoods.update(food.id, { imageUrl: imageUrl });

    // 4. 更新界面上对应卡片的显示，用图片替换加载动画
    const cardElement = document.querySelector(`.product-card[data-food-id="${food.id}"]`);
    if (cardElement) {
      const imageContainer = cardElement.querySelector('.product-image-container');
      if (imageContainer) {
        imageContainer.innerHTML = `<img src="${imageUrl}" class="product-image" alt="${food.name}">`;
      }
    }
  } catch (error) {
    // 理论上很难触发，但作为保险
    console.error(`处理美食 "${food.name}" 图片时失败:`, error);
    const cardElement = document.querySelector(`.product-card[data-food-id="${food.id}"]`);
    if (cardElement) {
      const imageContainer = cardElement.querySelector('.product-image-container');
      if (imageContainer) {
        imageContainer.innerHTML = `<span>图片<br>加载失败</span>`;
      }
    }
  }
}

// ▲▲▲ 替换结束 ▲▲▲

/**
 * 【最终版 | 无API调用 & 无限重试】为商品名称生成图片
 * @param {string} productName - 商品的中文名称
 * @returns {Promise<string>} - 返回一个Promise，它最终会resolve为一个有效的图片URL
 */
async function generateImageForProduct(productName) {
  // 1. 调用我们的新函数，根据商品名智能选择一个提示词（不再需要API！）
  const imagePrompt = selectGenericImagePrompt(productName);
  console.log(`为“${productName}”选定的提示词:`, imagePrompt);

  // 2. 调用我们已具备“无限重试”功能的核心图片生成函数
  // 这个函数会一直尝试，直到成功返回一个图片URL
  try {
    const imageUrl = await generateAndLoadImage(imagePrompt);
    return imageUrl;
  } catch (error) {
    // 理论上，由于 generateAndLoadImage 是无限循环，代码不会执行到这里。
    // 但为了代码健壮性，我们仍然保留一个最终的备用方案。
    console.error(`[终极捕获] 为 "${productName}" 生成图片时发生不可预知的错误:`, error);
    return getRandomDefaultProductImage();
  }
}

async function renderChatList() {
  const chatListEl = document.getElementById('chat-list');
  chatListEl.innerHTML = '';

  // 1. 获取所有聊天和分组数据
  const allChats = Object.values(state.chats);
  const allGroups = await db.qzoneGroups.toArray();

  if (allChats.length === 0) {
    chatListEl.innerHTML =
      '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">点击右上角 "+" 或群组图标添加聊天</p>';
    return;
  }

  // 2. 将聊天明确地分为“置顶”和“未置顶”两组
  const pinnedChats = allChats.filter(chat => chat.isPinned);
  const unpinnedChats = allChats.filter(chat => !chat.isPinned);

  // 3. 对置顶的聊天，仅按最新消息时间排序
  pinnedChats.sort((a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0));

  // 4. 【优先渲染】所有置顶的聊天
  pinnedChats.forEach(chat => {
    const item = createChatListItem(chat);
    chatListEl.appendChild(item);
  });

  // 5. 【接下来处理未置顶的聊天】应用您之前的分组逻辑
  // 为每个分组找到其内部最新的消息时间戳 (只在未置顶聊天中查找)
  allGroups.forEach(group => {
    const latestChatInGroup = unpinnedChats
      .filter(chat => chat.groupId === group.id) // 找到属于这个组的聊天
      .sort((a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0))[0]; // 排序后取第一个

    group.latestTimestamp = latestChatInGroup ? latestChatInGroup.history.slice(-1)[0]?.timestamp || 0 : 0;
  });

  // 根据分组的最新时间戳，对分组本身进行排序
  allGroups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);

  // 6. 遍历排序后的分组，渲染其中的【未置顶】好友
  allGroups.forEach(group => {
    const groupChats = unpinnedChats
      .filter(chat => !chat.isGroup && chat.groupId === group.id)
      .sort((a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0));

    if (groupChats.length === 0) return; // 如果这个分组里没有未置顶的好友，就跳过

    const groupContainer = document.createElement('div');
    groupContainer.className = 'chat-group-container';

    // 【核心修改】下面这两行代码里，我已经删除了 collapsed 类，这样默认就是展开的了！
    groupContainer.innerHTML = `
            <div class="chat-group-header">
                <span class="arrow">▼</span>
                <span class="group-name">${group.name}</span>
            </div>
            <div class="chat-group-content"></div>
        `;
    const contentEl = groupContainer.querySelector('.chat-group-content');

    groupChats.forEach(chat => {
      const item = createChatListItem(chat);
      contentEl.appendChild(item);
    });
    chatListEl.appendChild(groupContainer);
  });

  // 7. 最后，渲染所有【未置顶】的群聊和【未分组的】好友
  const remainingChats = unpinnedChats
    .filter(chat => chat.isGroup || (!chat.isGroup && !chat.groupId))
    .sort((a, b) => (b.history.slice(-1)[0]?.timestamp || 0) - (a.history.slice(-1)[0]?.timestamp || 0));

  remainingChats.forEach(chat => {
    const item = createChatListItem(chat);
    chatListEl.appendChild(item);
  });

  // 为所有分组标题添加折叠事件
  document.querySelectorAll('.chat-group-header').forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('collapsed');
      header.nextElementSibling.classList.toggle('collapsed');
    });
  });
}
// ▼▼▼ 用这块【V3 - Emoji图标版】代码，完整替换你旧的 createChatListItem 函数 ▼▼▼
function createChatListItem(chat) {
  const lastMsgObj = chat.history.filter(msg => !msg.isHidden).slice(-1)[0] || {};
  let lastMsgDisplay;

  // --- 消息预览的逻辑 (这部分保持不变) ---
  if (!chat.isGroup && chat.relationship?.status === 'pending_user_approval') {
    lastMsgDisplay = `<span style="color: #ff8c00;">[好友申请] ${
      chat.relationship.applicationReason || '请求添加你为好友'
    }</span>`;
  } else if (!chat.isGroup && chat.relationship?.status === 'blocked_by_ai') {
    lastMsgDisplay = `<span style="color: #dc3545;">[你已被对方拉黑]</span>`;
  } else if (chat.isGroup) {
    if (lastMsgObj.type === 'pat_message') {
      lastMsgDisplay = `[系统消息] ${lastMsgObj.content}`;
    } else if (lastMsgObj.type === 'transfer') {
      lastMsgDisplay = '[转账]';
    } else if (lastMsgObj.type === 'ai_image' || lastMsgObj.type === 'user_photo') {
      lastMsgDisplay = '[照片]';
    } else if (lastMsgObj.type === 'voice_message') {
      lastMsgDisplay = '[语音]';
    } else if (typeof lastMsgObj.content === 'string' && STICKER_REGEX.test(lastMsgObj.content)) {
      lastMsgDisplay = lastMsgObj.meaning ? `[表情: ${lastMsgObj.meaning}]` : '[表情]';
    } else if (Array.isArray(lastMsgObj.content)) {
      lastMsgDisplay = `[图片]`;
    } else {
      lastMsgDisplay = String(lastMsgObj.content || '...').substring(0, 20);
    }
    if (lastMsgObj.senderName && lastMsgObj.type !== 'pat_message') {
      lastMsgDisplay = `${lastMsgObj.senderName}: ${lastMsgDisplay}`;
    }
  } else {
    const statusText = chat.status?.text || '在线';
    lastMsgDisplay = `[${statusText}]`;
  }

  const lastMsgTimestamp = lastMsgObj?.timestamp;
  const timeDisplay = formatChatListTimestamp(lastMsgTimestamp);

  const container = document.createElement('div');
  container.className = 'chat-list-item-swipe-container';
  container.dataset.chatId = chat.id;

  const content = document.createElement('div');
  content.className = `chat-list-item-content ${chat.isPinned ? 'pinned' : ''}`;

  const avatar = chat.isGroup ? chat.settings.groupAvatar : chat.settings.aiAvatar;

  // ★★★★★ 这就是我们本次修改的核心！ ★★★★★
  let streakHtml = '';
  // 检查是否为单聊、功能是否开启
  if (!chat.isGroup && chat.settings.streak && chat.settings.streak.enabled) {
    const streak = chat.settings.streak;

    let isExtinguished = false;
    if (streak.lastInteractionDate && streak.extinguishThreshold !== -1) {
      const lastDate = new Date(streak.lastInteractionDate);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const daysDiff = (todayDate - lastDate) / (1000 * 3600 * 24);
      if (daysDiff >= streak.extinguishThreshold) {
        isExtinguished = true;
      }
    }

    // 准备图标和颜色
    const litIconUrl = streak.litIconUrl;
    const extinguishedIconUrl = streak.extinguishedIconUrl;
    const fontColor = streak.fontColor || '#ff6f00'; // 如果没设置颜色，就用默认的橙色

    let iconHtml = '';

    if (isExtinguished) {
      // 如果熄灭了，优先用自定义熄灭图片，否则用默认 Emoji
      iconHtml = extinguishedIconUrl
        ? `<img src="${extinguishedIconUrl}" style="height: 1.2em; vertical-align: middle;">`
        : '🧊';
    } else if (streak.currentDays > 0) {
      // 如果在续，优先用自定义点亮图片，否则用默认 Emoji
      iconHtml = litIconUrl ? `<img src="${litIconUrl}" style="height: 1.2em; vertical-align: middle;">` : '🔥';
    }

    // 拼接最终的HTML
    if (iconHtml) {
      // 【核心修改】在这里我们增加一个判断
      // 如果火花已熄灭 (isExtinguished 为 true)
      if (isExtinguished) {
        // 就只显示熄灭的图标，不显示天数
        streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}</span>`;
      }
      // 如果是永不熄灭模式（并且未熄灭）
      else if (streak.currentDays === -1 || streak.initialDays === -1) {
        streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}∞</span>`;
      }
      // 其他所有情况（即，火花是点亮的）
      else {
        // 才显示图标和天数
        streakHtml = `<span class="streak-indicator" style="color: ${fontColor};">${iconHtml}${streak.currentDays}</span>`;
      }
    }
  }
  // ★★★★★ 修改结束 ★★★★★

  // 后续的HTML拼接部分保持不变
  content.innerHTML = `
        <div class="chat-list-item" data-chat-id="${chat.id}">
            <img src="${avatar || defaultAvatar}" class="avatar">
            <div class="info">
                <div class="name-line">
                    <span class="name">${chat.name}</span>
                    ${chat.isGroup ? '<span class="group-tag">群聊</span>' : ''}
                    ${streakHtml}
                </div>
                <div class="last-msg" style="color: ${
                  chat.isGroup ? 'var(--text-secondary)' : '#b5b5b5'
                }; font-style: italic;">${lastMsgDisplay}</div>
            </div>
            <div class="chat-list-right-column">
                <div class="chat-list-time">${timeDisplay}</div>
                <div class="unread-count-wrapper">
                    <span class="unread-count" style="display: none;">0</span>
                </div>
            </div>
        </div>
    `;

  // 后续的所有代码都保持不变...
  const actions = document.createElement('div');
  actions.className = 'swipe-actions';
  const pinButtonText = chat.isPinned ? '取消置顶' : '置顶';
  const pinButtonClass = chat.isPinned ? 'unpin' : 'pin';
  actions.innerHTML = `<button class="swipe-action-btn ${pinButtonClass}">${pinButtonText}</button><button class="swipe-action-btn delete">删除</button>`;

  container.appendChild(content);
  container.appendChild(actions);

  const unreadCount = chat.unreadCount || 0;
  const unreadEl = content.querySelector('.unread-count');
  if (unreadCount > 0) {
    unreadEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
    unreadEl.style.display = 'inline-flex';
  } else {
    unreadEl.style.display = 'none';
  }

  const infoEl = content.querySelector('.info');
  if (infoEl) {
    infoEl.addEventListener('click', () => openChat(chat.id));
  }
  const avatarEl = content.querySelector('.avatar, .avatar-with-frame');
  if (avatarEl) {
    avatarEl.addEventListener('click', e => {
      e.stopPropagation();
      handleUserPat(chat.id, chat.name);
    });
  }

  return container;
}

/**
 * 【全新】根据时间戳，格式化聊天列表右侧的日期/时间显示
 * @param {number} timestamp - 消息的时间戳
 * @returns {string} - 格式化后的字符串 (例如 "14:30", "昨天", "08/03")
 */
function formatChatListTimestamp(timestamp) {
  if (!timestamp) return ''; // 如果没有时间戳，返回空字符串

  const now = new Date();
  const msgDate = new Date(timestamp);

  // 判断是否为今天
  const isToday =
    now.getFullYear() === msgDate.getFullYear() &&
    now.getMonth() === msgDate.getMonth() &&
    now.getDate() === msgDate.getDate();

  if (isToday) {
    // 如果是今天，只显示时间
    return msgDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  // 判断是否为昨天
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getFullYear() === msgDate.getFullYear() &&
    yesterday.getMonth() === msgDate.getMonth() &&
    yesterday.getDate() === msgDate.getDate();

  if (isYesterday) {
    return '昨天';
  }

  // 判断是否为今年
  if (now.getFullYear() === msgDate.getFullYear()) {
    // 如果是今年，显示 "月/日"
    const month = String(msgDate.getMonth() + 1).padStart(2, '0');
    const day = String(msgDate.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  }

  // 如果是更早的年份，显示 "年/月/日"
  const year = msgDate.getFullYear();
  const month = String(msgDate.getMonth() + 1).padStart(2, '0');
  const day = String(msgDate.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// ▲▲▲ 替换结束 ▲▲▲
// ▲▲▲ 替换结束 ▲▲▲
function showNotification(chatId, messageContent) {
  playNotificationSound();
  clearTimeout(notificationTimeout);
  const chat = state.chats[chatId];
  if (!chat) return;
  const bar = document.getElementById('notification-bar');
  document.getElementById('notification-avatar').src =
    chat.settings.aiAvatar || chat.settings.groupAvatar || defaultAvatar;
  document.getElementById('notification-content').querySelector('.name').textContent = chat.name;
  document.getElementById('notification-content').querySelector('.message').textContent = messageContent;
  const newBar = bar.cloneNode(true);
  bar.parentNode.replaceChild(newBar, bar);
  newBar.addEventListener('click', () => {
    openChat(chatId);
    newBar.classList.remove('visible');
  });
  newBar.classList.add('visible');
  notificationTimeout = setTimeout(() => {
    newBar.classList.remove('visible');
  }, 4000);
}
function addLongPressListener(element, callback) {
  let pressTimer;
  const startPress = e => {
    if (isSelectionMode) return;
    e.preventDefault();
    pressTimer = window.setTimeout(() => callback(e), 500);
  };
  const cancelPress = () => clearTimeout(pressTimer);
  element.addEventListener('mousedown', startPress);
  element.addEventListener('mouseup', cancelPress);
  element.addEventListener('mouseleave', cancelPress);
  element.addEventListener('touchstart', startPress, { passive: true });
  element.addEventListener('touchend', cancelPress);
  element.addEventListener('touchmove', cancelPress);
}
/**
 * 【优化版】播放消息提示音，增加健壮性
 */
function playNotificationSound() {
  const soundUrl =
    state.globalSettings.notificationSoundUrl || 'https://laddy-lulu.github.io/Ephone-stuffs/message.mp3';

  // 1. 增加安全检查：如果链接为空，直接返回，不执行任何操作
  if (!soundUrl || !soundUrl.trim()) return;

  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.7;

    audio.play().catch(error => {
      // 2. 优化错误提示，现在能更准确地反映问题
      if (error.name === 'NotAllowedError') {
        console.warn('播放消息提示音失败：用户需要先与页面进行一次交互（如点击）才能自动播放音频。');
      } else {
        // 对于其他错误（比如我们这次遇到的），直接打印错误详情
        console.error(`播放消息提示音失败 (${error.name}): ${error.message}`, 'URL:', soundUrl);
      }
    });
  } catch (error) {
    console.error('创建提示音Audio对象时出错:', error);
  }
}
// ▲▲▲ 替换结束 ▲▲▲
/**
 * 【全新】获取一张随机的外卖默认图片
 * @returns {string} - 返回一张随机图片的URL
 */
function getRandomWaimaiImage() {
  const defaultImages = [
    'https://i.postimg.cc/mD8DB9Q7/food1.jpg',
    'https://i.postimg.cc/W12WqgJp/food2.jpg',
    'https://i.postimg.cc/KzA1df4y/food3.jpg',
  ];
  return defaultImages[Math.floor(Math.random() * defaultImages.length)];
}

// 在这里找到你原来的 getRandomDefaultProductImage 函数...

/**
 * 【全新】获取一张随机的淘宝宝贝默认图片
 * @returns {string} - 返回一张随机图片的URL
 */
function getRandomDefaultProductImage() {
  const defaultImages = [
    'https://i.postimg.cc/W4svy4Hm/Image-1760206134285.jpg',
    'https://i.postimg.cc/jjRb1jF7/Image-1760206125678.jpg',
  ];
  // 从数组中随机选择一个并返回
  return defaultImages[Math.floor(Math.random() * defaultImages.length)];
}

// ▲▲▲ 新增代码粘贴结束 ▲▲▲
// ▼▼▼ 把这两块全新的函数，粘贴到 init() 函数的上方 ▼▼▼

/**
 * 【全新】核心函数：更新用户余额并记录一笔交易
 * @param {number} amount - 交易金额 (正数为收入, 负数为支出)
 * @param {string} description - 交易描述 (例如: "转账给 XX", "收到 XX 的红包")
 */
async function updateUserBalanceAndLogTransaction(amount, description) {
  if (isNaN(amount)) return; // 安全检查

  // 确保余额是数字
  state.globalSettings.userBalance = (state.globalSettings.userBalance || 0) + amount;

  const newTransaction = {
    type: amount > 0 ? 'income' : 'expense',
    amount: Math.abs(amount),
    description: description,
    timestamp: Date.now(),
  };

  // 使用数据库事务，确保两步操作要么都成功，要么都失败
  await db.transaction('rw', db.globalSettings, db.userWalletTransactions, async () => {
    await db.globalSettings.put(state.globalSettings);
    await db.userWalletTransactions.add(newTransaction);
  });

  console.log(`用户钱包已更新: 金额=${amount.toFixed(2)}, 新余额=${state.globalSettings.userBalance.toFixed(2)}`);
}
/**
 * 【全新】处理角色手机钱包余额和交易记录的通用函数
 * @param {string} charId - 要更新钱包的角色ID
 * @param {number} amount - 交易金额 (正数为收入, 负数为支出)
 * @param {string} description - 交易描述
 */
async function updateCharacterPhoneBankBalance(charId, amount, description) {
  const chat = state.chats[charId];
  if (!chat || chat.isGroup) return;

  if (!chat.characterPhoneData) chat.characterPhoneData = {};
  if (!chat.characterPhoneData.bank) chat.characterPhoneData.bank = { balance: 0, transactions: [] };
  if (typeof chat.characterPhoneData.bank.balance !== 'number') chat.characterPhoneData.bank.balance = 0;

  chat.characterPhoneData.bank.balance += amount;

  const newTransaction = {
    type: amount > 0 ? '收入' : '支出',
    amount: Math.abs(amount),
    description: description,
    timestamp: Date.now(),
  };

  // 让最新的交易记录显示在最前面
  if (!Array.isArray(chat.characterPhoneData.bank.transactions)) {
    chat.characterPhoneData.bank.transactions = [];
  }
  chat.characterPhoneData.bank.transactions.unshift(newTransaction);

  await db.chats.put(chat);
  console.log(
    `✅ 角色[${chat.name}]钱包已更新: 金额=${amount.toFixed(2)}, 新余额=${chat.characterPhoneData.bank.balance.toFixed(
      2,
    )}`,
  );
}
/* --- 【全新】“桃宝”App 核心功能函数 --- */

/**
 * 【全新 | 已修复】清空桃宝首页的所有商品及购物车
 */
async function clearTaobaoProducts() {
  // 1. 修改提示语，告知用户购物车也会被清空
  const confirmed = await showCustomConfirm(
    '确认清空',
    '确定要清空桃宝首页的所有商品吗？此操作将【一并清空购物车】，且无法恢复。',
    { confirmButtonClass: 'btn-danger' },
  );

  if (confirmed) {
    try {
      // 使用数据库事务，确保两步操作要么都成功，要么都失败，更安全
      await db.transaction('rw', db.taobaoProducts, db.taobaoCart, async () => {
        // 清空商品库
        await db.taobaoProducts.clear();
        // ▼▼▼ 核心新增代码1：清空购物车数据库 ▼▼▼
        await db.taobaoCart.clear();
      });

      // 重新渲染UI
      await renderTaobaoProducts();
      // ▼▼▼ 核心新增代码2：刷新购物车UI（让页面变空） ▼▼▼
      await renderTaobaoCart();
      // ▼▼▼ 核心新增代码3：更新购物车角标（让红点消失） ▼▼▼
      updateCartBadge();

      // 2. 修改成功提示
      await showCustomAlert('操作成功', '所有商品及购物车已被清空！');
    } catch (error) {
      console.error('清空桃宝商品时出错:', error);
      await showCustomAlert('操作失败', `发生错误: ${error.message}`);
    }
  }
}

/**
 * 【总入口】打开“桃宝”App，并渲染默认视图
 */
async function openTaobaoApp() {
  showScreen('taobao-screen');
  await renderTaobaoProducts(); // 默认显示所有商品
  renderBalanceDetails(); // 刷新余额显示
}

// ▼▼▼ 用这块【修改后】的代码，替换旧的 renderElemeFoods 函数 ▼▼▼

/**
 * 【V3 | 顺序生图版】渲染“饿了么”页面的美食列表
 */
async function renderElemeFoods() {
  const gridEl = document.getElementById('eleme-grid');
  gridEl.innerHTML = '';
  const foods = await db.elemeFoods.toArray();

  if (foods.length === 0) {
    gridEl.innerHTML =
      '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary);">还没有美食哦，点击右上角“✨”或“+”来发现美味吧！</p>';
    return;
  }

  foods.forEach(food => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.cursor = 'pointer';
    card.dataset.foodId = food.id;

    card.innerHTML = `
        <div class="product-image-container">
            <!-- 图片或加载动画将在这里 -->
        </div>
        <div class="product-info">
            <div class="product-name" title="${food.name} · ${food.restaurant}">${food.name}</div>
            <div class="product-price">¥${food.price.toFixed(2)}</div>
        </div>
    `;

    const imageContainer = card.querySelector('.product-image-container');

    if (food.imageUrl) {
      imageContainer.innerHTML = `<img src="${food.imageUrl}" class="product-image" alt="${food.name}">`;
    } else {
      imageContainer.innerHTML = `<div class="loading-spinner"></div>`;
      // ★★★ 核心修改1：不再直接调用，而是将任务添加到队列 ★★★
      imageGenerationQueue.push({ type: 'eleme', item: food });
    }

    addLongPressListener(card, () => showFoodActions(food.id));
    gridEl.appendChild(card);
  });

  // ★★★ 核心修改2：渲染完所有卡片后，触发一次队列处理器 ★★★
  processImageQueue();
}

// ▲▲▲ 替换结束 ▲▲▲

/**
 * 【全新】打开美食详情弹窗
 * @param {number} foodId - 美食的ID
 */
async function openFoodDetail(foodId) {
  const food = await db.elemeFoods.get(foodId);
  if (!food) return;

  const modal = document.getElementById('product-detail-modal');
  const bodyEl = document.getElementById('product-detail-body');
  const reviewsSection = document.getElementById('product-reviews-section');
  const closeBtn = document.getElementById('close-product-detail-btn');
  const actionBtn = document.getElementById('detail-add-to-cart-btn');

  // 1. 渲染美食基本信息
  bodyEl.innerHTML = `
        <img src="${food.imageUrl}" class="product-image" alt="${food.name}">
        <h2 class="product-name">${food.name}</h2>
        <p class="product-price">¥${food.price.toFixed(2)}</p>
        <p style="color: #888; font-size: 13px;">店铺: ${food.restaurant || '精选商家'}</p>
    `;

  // 2. 隐藏不相关的“宝贝评价”区域
  reviewsSection.style.display = 'none';

  // 3. 改造底部按钮
  const newActionBtn = actionBtn.cloneNode(true);
  newActionBtn.textContent = '给Ta点单'; // 修改按钮文字
  actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);

  // 为新按钮绑定“点单”逻辑
  newActionBtn.onclick = async () => {
    modal.classList.remove('visible'); // 先关闭弹窗
    await handleOrderForChar(foodId); // 再执行点单流程
  };

  // 绑定关闭按钮
  closeBtn.onclick = () => modal.classList.remove('visible');

  // 显示弹窗
  modal.classList.add('visible');
}
/**
 * 【全新】清空饿了么的所有美食
 */
async function clearElemeFoods() {
  const confirmed = await showCustomConfirm('确认清空', '确定要清空饿了么的所有美食吗？此操作无法恢复。', {
    confirmButtonClass: 'btn-danger',
  });

  if (confirmed) {
    try {
      await db.elemeFoods.clear(); // 清空美食数据库
      await renderElemeFoods(); // 重新渲染UI，显示空状态
      await showCustomAlert('操作成功', '所有美食已被清空！');
    } catch (error) {
      console.error('清空饿了么美食时出错:', error);
      await showCustomAlert('操作失败', `发生错误: ${error.message}`);
    }
  }
}

// ▼▼▼ 用这块【V3-多品类版】代码，完整替换旧的 handleGenerateFoodsAI 函数 ▼▼▼
/**
 * 【AI核心 | V3多品类版】为“饿了么”随机生成商品
 */
async function handleGenerateFoodsAI() {
  await showCustomAlert('请稍候...', 'AI正在搜罗全城好物...');
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) {
    alert('请先在API设置中配置好才能使用AI功能哦！');
    return;
  }

  const prompt = `
# 任务
你是一个外卖App“饿了么”的编辑。请为我随机推荐5-8款外卖商品。

# 核心规则
1.  **商品多样性**: 商品类型必须多样化，可以包含【美食、零食、饮料、药品、日用品】等。
2.  **名称诱人**: 商品名称要听起来就很好。
3.  **格式铁律**: 你的回复【必须且只能】是一个严格的JSON数组，每个对象代表一款商品，并包含以下字段:
    -   \`"name"\`: 商品名称 (字符串)
    -   \`"price"\`: 价格 (数字)
    -   \`"restaurant"\`: 虚拟的店铺名称 (字符串)
    -   \`"category"\`: 商品分类 (字符串, 例如: "美食", "饮品", "零食", "药品", "日用")
    -   \`"imagePrompt"\`: 一个详细的、用于文生图AI的【英文提示词】，用于生成一张关于该商品的【诱人的产品图 (appetizing product shot)】。

# JSON输出格式示例:
[
  {
    "name": "多肉葡萄奶盖茶",
    "price": 22.0,
    "restaurant": "奈雪的茶",
    "category": "饮品",
    "imagePrompt": "A cup of grape cheese foam tea, with fresh grape pulp, product shot, minimalist, vibrant, delicious and appetizing, commercial photography"
  },
  {
    "name": "布洛芬缓释胶囊",
    "price": 15.5,
    "restaurant": "家门口药房",
    "category": "药品",
    "imagePrompt": "A box of Ibuprofen sustained-release capsules, clean medical product shot, minimalist, on a white background, professional photography"
  }
]`;

  try {
    const messagesForApi = [{ role: 'user', content: prompt }];
    const isGemini = proxyUrl === GEMINI_API_URL;
    const requestData = isGemini
      ? toGeminiRequestData(model, apiKey, prompt, messagesForApi, isGemini)
      : {
          url: `${proxyUrl}/v1/chat/completions`,
          options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: model,
              messages: messagesForApi,
              temperature: 1.1,
              response_format: { type: 'json_object' },
            }),
          },
        };
    const response = await fetch(requestData.url, requestData.options);
    if (!response.ok) throw new Error(`API请求失败: ${await response.text()}`);
    const data = await response.json();
    const rawContent = isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
    let newFoods;
    try {
      newFoods = JSON.parse(rawContent.replace(/^```json\s*|```$/g, '').trim());
    } catch (e) {
      throw new Error('AI返回的JSON格式不正确。');
    }

    if (Array.isArray(newFoods) && newFoods.length > 0) {
      const foodsToSave = newFoods.map(food => ({ ...food, imageUrl: '' }));
      await db.elemeFoods.bulkAdd(foodsToSave);
      await renderElemeFoods(); // 重新渲染饿了么页面
      await showCustomAlert('生成成功！', `已成功为您推荐 ${newFoods.length} 款商品！`);
    } else {
      throw new Error('AI返回的数据格式不正确或为空。');
    }
  } catch (error) {
    console.error('AI生成饿了么商品失败:', error);
    await showCustomAlert('生成失败', `发生错误: ${error.message}`);
  }
}
// ▲▲▲ 替换结束 ▲▲▲

// ▼▼▼ 用这块【V3-多品类版】代码，完整替换旧的 handleSearchFoodsAI 函数 ▼▼▼
/**
 * 【AI核心 | V3多品类版】根据关键词搜索商品
 */
async function handleSearchFoodsAI() {
  const searchTerm = document.getElementById('eleme-search-input').value.trim();
  if (!searchTerm) {
    alert('请输入你想搜索的商品关键词！');
    return;
  }

  await showCustomAlert('请稍候...', `AI正在为你寻找关于“${searchTerm}”的商品...`);
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) {
    alert('请先配置API！');
    return;
  }

  const prompt = `
# 任务
你是一个外卖App“饿了么”的搜索引擎。请根据用户提供的【搜索关键词】，为Ta创作一个包含5-8件相关外卖商品的列表。

# 用户搜索的关键词:
"${searchTerm}"

# 核心规则
1.  **高度相关**: 所有商品都必须与用户的搜索关键词 "${searchTerm}" 紧密相关。
2.  **格式铁律**: 你的回复【必须且只能】是一个严格的JSON数组，每个对象代表一款商品，并包含以下字段:
    -   \`"name"\`: 商品名称
    -   \`"price"\`: 价格 (数字)
    -   \`"restaurant"\`: 虚拟的店铺名称
    -   \`"category"\`: 商品分类 (例如: "美食", "饮品", "零食", "药品", "日用")
    -   \`"imagePrompt"\`: 一个详细的、用于文生图AI的【英文提示词】，用于生成一张关于“${searchTerm}”的【诱人的产品图 (appetizing product shot)】。

# JSON输出格式示例:
[
  {
    "name": "经典意式肉酱面",
    "price": 42.0,
    "restaurant": "街角意面馆",
    "category": "美食",
    "imagePrompt": "A bowl of classic Italian bolognese pasta, food photography, close-up, delicious and appetizing, garnished with basil leaves, high detail"
  }
]`;

  try {
    const messagesForApi = [{ role: 'user', content: prompt }];
    const isGemini = proxyUrl === GEMINI_API_URL;
    const requestData = isGemini
      ? toGeminiRequestData(model, apiKey, prompt, messagesForApi, isGemini)
      : {
          url: `${proxyUrl}/v1/chat/completions`,
          options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: model,
              messages: messagesForApi,
              temperature: 0.8,
              response_format: { type: 'json_object' },
            }),
          },
        };

    const response = await fetch(requestData.url, requestData.options);
    if (!response.ok) throw new Error(`API请求失败: ${await response.text()}`);

    const data = await response.json();
    const rawContent = isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
    let foundFoods;
    try {
      foundFoods = JSON.parse(rawContent.replace(/^```json\s*|```$/g, '').trim());
    } catch (e) {
      throw new Error('AI返回的JSON格式不正确。');
    }

    if (Array.isArray(foundFoods) && foundFoods.length > 0) {
      const foodsToSave = foundFoods.map(food => ({ ...food, imageUrl: '' }));
      await db.elemeFoods.bulkAdd(foodsToSave);
      await renderElemeFoods(); // 刷新列表
      await showCustomAlert('搜索成功！', `AI找到的 ${foundFoods.length} 款商品已添加到列表！`);
    } else {
      throw new Error('AI没有找到相关的商品。');
    }
  } catch (error) {
    console.error('AI搜索饿了么商品失败:', error);
    await showCustomAlert('搜索失败', `发生错误: ${error.message}`);
  }
}
// ▲▲▲ 替换结束 ▲▲▲

/**
 * 【修改版】打开美食编辑器（支持添加和编辑）
 * @param {number|null} foodId - 如果是编辑模式，传入美食ID；否则为null
 */
async function openFoodEditor(foodId = null) {
  currentEditingFoodId = foodId; // 保存正在编辑的美食ID
  const modal = document.getElementById('product-editor-modal');
  const titleEl = document.getElementById('product-editor-title');

  // 调整UI和填充数据
  document.getElementById('product-category-input').placeholder = '店铺名 (选填)';
  // 确保保存按钮的事件指向美食保存函数
  const saveBtn = document.getElementById('save-product-btn');
  const newSaveBtn = saveBtn.cloneNode(true); // 克隆以清除旧事件
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  newSaveBtn.addEventListener('click', saveFoodItem);

  if (foodId) {
    // 编辑模式
    titleEl.textContent = '编辑美食';
    const food = await db.elemeFoods.get(foodId);
    if (food) {
      document.getElementById('product-name-input').value = food.name;
      document.getElementById('product-price-input').value = food.price;
      document.getElementById('product-image-input').value = food.imageUrl;
      document.getElementById('product-category-input').value = food.restaurant || '';
    }
  } else {
    // 添加模式
    titleEl.textContent = '手动添加美食';
    // 清空输入框
    document.getElementById('product-name-input').value = '';
    document.getElementById('product-price-input').value = '';
    document.getElementById('product-image-input').value = '';
    document.getElementById('product-category-input').value = '';
  }

  modal.classList.add('visible');
}

/**
 * 【修改版】保存手动添加或编辑的美食
 */
async function saveFoodItem() {
  const name = document.getElementById('product-name-input').value.trim();
  const price = parseFloat(document.getElementById('product-price-input').value);
  let imageUrl = document.getElementById('product-image-input').value.trim();
  const restaurant = document.getElementById('product-category-input').value.trim();

  if (!name || isNaN(price) || price <= 0) {
    alert('请填写美食名称和有效价格！');
    return;
  }

  // 如果用户没有提供图片链接，则留空，让渲染器去触发AI生图
  if (!imageUrl) {
    imageUrl = '';
  }

  const foodData = { name, price, imageUrl, restaurant: restaurant || '私房小厨' };

  try {
    if (currentEditingFoodId) {
      // 更新模式
      await db.elemeFoods.update(currentEditingFoodId, foodData);
      await showCustomAlert('保存成功', '美食信息已更新！');
    } else {
      // 添加模式
      await db.elemeFoods.add(foodData);
      await showCustomAlert('添加成功', '新美食已添加！');
    }

    // 操作完成后关闭弹窗并刷新列表
    document.getElementById('product-editor-modal').classList.remove('visible');
    await renderElemeFoods();
  } catch (error) {
    console.error('保存美食失败:', error);
    await showCustomAlert('保存失败', `发生错误: ${error.message}`);
  } finally {
    currentEditingFoodId = null; // 无论成功失败，都重置编辑ID
  }
}

// ▼▼▼ 用这块【V2-带备注版】代码，完整替换旧的 handleOrderForChar 函数 ▼▼▼
/**
 * 【全新 | V2带备注版】核心函数：处理用户点击“给Ta点单”的完整流程
 * @param {number} foodId - 被点击的美食的ID
 */
async function handleOrderForChar(foodId) {
  const food = await db.elemeFoods.get(foodId);
  if (!food) return;

  // 1. 检查用户余额
  if ((state.globalSettings.userBalance || 0) < food.price) {
    alert('你的余额不足，无法为Ta点单！');
    return;
  }

  // 2. 打开角色选择器，让用户选择为谁点单
  const targetCharId = await openCharSelectorForEleme();
  if (!targetCharId) return; // 如果用户取消了选择，则结束流程

  const char = state.chats[targetCharId];
  if (!char) return;

  // 3. 弹出最终确认框
  const confirmed = await showCustomConfirm(
    '确认点单',
    `确定要花费 ¥${food.price.toFixed(2)} 为“${char.name}”点一份“${food.name}”吗？`,
    { confirmText: '立即下单' },
  );

  if (confirmed) {
    // ★★★★★ 核心新增：在这里弹出备注输入框 ★★★★★
    const remark = await showCustomPrompt(
      '外卖备注 (可选)',
      '有什么想对骑手或商家说的吗？',
      '无接触配送，谢谢！', // 这是一个友好的默认值
    );
    // 如果用户点了取消，remark会是null，但不影响流程

    await showCustomAlert('请稍候...', `正在为“${char.name}”下单...`);

    // 4. 扣除用户余额
    await updateUserBalanceAndLogTransaction(-food.price, `为 ${char.name} 点外卖: ${food.name}`);

    // 5. 创建外卖订单记录
    await db.elemeOrders.add({
      foodId: foodId,
      quantity: 1,
      timestamp: Date.now(),
      status: '已下单',
      recipientId: targetCharId,
    });

    // 6. ★★★★★ 核心修改：将备注传给通知函数 ★★★★★
    await sendElemeOrderNotificationToChar(targetCharId, food, remark);

    await showCustomAlert('下单成功！', `已为“${char.name}”点好外卖，并已通过私信通知对方啦！`);
    renderChatList();
  }
}
// ▲▲▲ 替换结束 ▲▲▲

/**
 * 【全新】辅助函数：打开一个单选的角色选择器
 * @returns {Promise<string|null>} - 返回选中的角色ID，如果取消则返回null
 */
async function openCharSelectorForEleme() {
  return new Promise(resolve => {
    const modal = document.getElementById('share-target-modal');
    const listEl = document.getElementById('share-target-list');
    const titleEl = document.getElementById('share-target-modal-title');
    const confirmBtn = document.getElementById('confirm-share-target-btn');
    const cancelBtn = document.getElementById('cancel-share-target-btn');

    titleEl.textContent = '要为谁点单？';
    listEl.innerHTML = '';

    const singleChats = Object.values(state.chats).filter(c => !c.isGroup);

    if (singleChats.length === 0) {
      alert('你还没有任何可以点单的好友哦。');
      modal.classList.remove('visible');
      resolve(null);
      return;
    }

    singleChats.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'contact-picker-item';
      item.innerHTML = `
                <input type="radio" name="eleme-target" value="${chat.id}" id="target-${
        chat.id
      }" style="margin-right: 15px;">
                <label for="target-${chat.id}" style="display:flex; align-items:center; width:100%; cursor:pointer;">
                    <img src="${chat.settings.aiAvatar || defaultAvatar}" class="avatar">
                    <span class="name">${chat.name}</span>
                </label>
            `;
      listEl.appendChild(item);
    });

    modal.classList.add('visible');

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const cleanup = () => modal.classList.remove('visible');

    newConfirmBtn.onclick = () => {
      const selectedRadio = document.querySelector('input[name="eleme-target"]:checked');
      if (selectedRadio) {
        cleanup();
        resolve(selectedRadio.value);
      } else {
        alert('请选择一个点单对象！');
      }
    };

    newCancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };
  });
}

// ▼▼▼ 用这块【V2-带备注版】代码，完整替换旧的 sendElemeOrderNotificationToChar 函数 ▼▼▼
/**
 * 【全新 | V2带备注】发送外卖订单通知到指定角色的聊天
 */
async function sendElemeOrderNotificationToChar(targetChatId, food, remark) {
  const chat = state.chats[targetChatId];
  if (!chat) return;

  // 准备给AI看的文本，现在包含了备注信息
  const textContentForAI = `[系统提示：用户给你点了一份来自“${food.restaurant}”的外卖“${food.name}”，并备注说：“${
    remark || '无'
  }”。请根据你的人设对此作出回应。]`;

  // 准备要渲染成卡片的数据 (payload)
  const notificationPayload = {
    foodName: food.name,
    foodImageUrl: food.imageUrl,
    senderName: state.qzoneSettings.nickname || '我',
    remark: remark || '', // 将备注保存到payload中
  };

  // 创建消息对象
  const notificationMessage = {
    role: 'user', // 由用户发出
    type: 'eleme_order_notification',
    timestamp: Date.now(),
    // content 字段现在用于AI理解上下文，而不是UI渲染
    content: `我给你点了份外卖：${food.name} `,
    payload: notificationPayload,
  };
  chat.history.push(notificationMessage);

  // 创建给AI看的隐藏指令
  const hiddenMessage = {
    role: 'system',
    content: textContentForAI,
    timestamp: Date.now() + 1,
    isHidden: true,
  };
  chat.history.push(hiddenMessage);

  chat.unreadCount = (chat.unreadCount || 0) + 1;
  await db.chats.put(chat);

  if (state.activeChatId !== targetChatId) {
    showNotification(targetChatId, '你收到了一份外卖！');
  }

  // 主动触发AI回应
  openChat(targetChatId);
}
// ▲▲▲ 替换结束 ▲▲▲

function switchTaobaoView(viewId) {
  document.querySelectorAll('.taobao-view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');

  document.querySelectorAll('.taobao-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.view === viewId);
  });

  if (viewId === 'orders-view') {
    renderTaobaoOrders();
  } else if (viewId === 'my-view') {
    renderBalanceDetails();
  } else if (viewId === 'cart-view') {
    renderTaobaoCart();
  } else if (viewId === 'eleme-view') {
    // <-- 新增的判断
    renderElemeFoods();
  }
}

/**
 * 【全新】渲染购物车页面
 */
async function renderTaobaoCart() {
  const listEl = document.getElementById('cart-item-list');
  const checkoutBar = document.getElementById('cart-checkout-bar');
  listEl.innerHTML = '';

  const cartItems = await db.taobaoCart.toArray();

  if (cartItems.length === 0) {
    listEl.innerHTML =
      '<p style="text-align:center; color: var(--text-secondary); padding: 50px 0;">购物车空空如也~</p>';
    checkoutBar.style.display = 'none';
    updateCartBadge(0);
    return;
  }

  checkoutBar.style.display = 'flex';
  let totalPrice = 0;
  let totalItems = 0;

  for (const item of cartItems) {
    const product = await db.taobaoProducts.get(item.productId);
    if (!product) continue;

    totalItems += item.quantity;
    totalPrice += product.price * item.quantity;

    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
            <img src="${product.imageUrl}" class="product-image" data-product-id="${product.id}">
            <div class="cart-item-info" data-product-id="${product.id}">
                <div class="product-name">${product.name}</div>
                <div class="product-price">¥${product.price.toFixed(2)}</div>
            </div>
            <div class="quantity-controls">
                <button class="quantity-decrease" data-cart-id="${item.id}" ${
      item.quantity <= 1 ? 'disabled' : ''
    }>-</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="quantity-increase" data-cart-id="${item.id}">+</button>
            </div>
            <button class="delete-cart-item-btn" data-cart-id="${item.id}">×</button>
        `;
    listEl.appendChild(itemEl);
  }

  document.getElementById('cart-total-price').textContent = `¥ ${totalPrice.toFixed(2)}`;
  const checkoutBtn = document.getElementById('checkout-btn');
  checkoutBtn.textContent = `结算(${totalItems})`;
  checkoutBtn.dataset.totalPrice = totalPrice; // 把总价存起来，方便结算时用

  updateCartBadge(totalItems);
}

/**
 * 【全新】更新购物车图标上的角标数量
 */
function updateCartBadge() {
  const badge = document.getElementById('cart-item-count-badge');
  db.taobaoCart.toArray().then(items => {
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalCount > 0) {
      badge.textContent = totalCount > 99 ? '99+' : totalCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  });
}

/**
 * 【全新】处理加入购物车的逻辑
 */
async function handleAddToCart(productId) {
  const existingItem = await db.taobaoCart.where('productId').equals(productId).first();
  if (existingItem) {
    // 如果已存在，则数量+1
    await db.taobaoCart.update(existingItem.id, { quantity: existingItem.quantity + 1 });
  } else {
    // 如果不存在，则新增
    await db.taobaoCart.add({ productId: productId, quantity: 1 });
  }
  await showCustomAlert('成功', '宝贝已加入购物车！');
  updateCartBadge(); // 更新角标
}

/**
 * 【全新】处理购物车内商品数量的变化
 */
async function handleChangeCartItemQuantity(cartId, change) {
  const item = await db.taobaoCart.get(cartId);
  if (!item) return;

  const newQuantity = item.quantity + change;
  if (newQuantity <= 0) {
    // 如果数量减到0，就删除该项
    await handleRemoveFromCart(cartId);
  } else {
    await db.taobaoCart.update(cartId, { quantity: newQuantity });
    await renderTaobaoCart();
  }
}

/**
 * 【全新】从购物车中移除商品
 */
async function handleRemoveFromCart(cartId) {
  await db.taobaoCart.delete(cartId);
  await renderTaobaoCart();
}

/**
 * 【全新 | 已修复状态污染问题】打开商品详情弹窗
 */
async function openProductDetail(productId) {
  const product = await db.taobaoProducts.get(productId);
  if (!product) return;

  const modal = document.getElementById('product-detail-modal');
  const bodyEl = document.getElementById('product-detail-body');
  const reviewsSection = document.getElementById('product-reviews-section');
  const reviewsListEl = document.getElementById('product-reviews-list');
  const generateBtn = document.getElementById('generate-reviews-btn');
  const actionBtn = document.getElementById('detail-add-to-cart-btn');

  // ★★★ 核心修复1：强制重置UI状态 ★★★
  // 无论上次是什么状态，都确保评价区是可见的
  reviewsSection.style.display = 'block';

  // 渲染商品基本信息
  bodyEl.innerHTML = `
        <img src="${product.imageUrl}" class="product-image" alt="${product.name}">
        <h2 class="product-name">${product.name}</h2>
        <p class="product-price">${product.price.toFixed(2)}</p>
        <p style="color: #888; font-size: 13px;">店铺: ${product.store || '桃宝自营'}</p>
    `;

  // 渲染评价区域
  reviewsListEl.innerHTML = '';
  if (product.reviews && product.reviews.length > 0) {
    product.reviews.forEach(review => {
      const reviewEl = document.createElement('div');
      reviewEl.className = 'product-review-item';
      reviewEl.innerHTML = `
                <div class="review-author">${review.author}</div>
                <p>${review.text}</p>
            `;
      reviewsListEl.appendChild(reviewEl);
    });
    generateBtn.style.display = 'none';
  } else {
    reviewsListEl.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary); font-size: 13px;">还没有人评价哦~</p>';
    generateBtn.style.display = 'block';
  }

  // 重新绑定“生成评价”按钮的事件 (防止重复绑定)
  const newGenerateBtn = generateBtn.cloneNode(true);
  generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
  newGenerateBtn.addEventListener('click', () => generateProductReviews(productId));

  // ★★★ 核心修复2：强制重置按钮并重新绑定事件 ★★★
  // 先克隆按钮以清除旧事件监听器
  const newAddToCartBtn = actionBtn.cloneNode(true);
  // 【关键】强制把按钮文字改回“加入购物车”
  newAddToCartBtn.textContent = '加入购物车';
  // 为新按钮绑定正确的“加入购物车”逻辑
  newAddToCartBtn.onclick = async () => {
    await handleAddToCart(productId);
    modal.classList.remove('visible'); // 添加后自动关闭弹窗
  };
  // 用焕然一新的按钮替换掉旧的那个
  actionBtn.parentNode.replaceChild(newAddToCartBtn, actionBtn);

  // 绑定关闭按钮
  document.getElementById('close-product-detail-btn').onclick = () => modal.classList.remove('visible');

  // 最后，显示弹窗
  modal.classList.add('visible');
}

/**
 * 【全新】AI核心：为指定商品生成评价
 * @param {number} productId - 商品的ID
 */
async function generateProductReviews(productId) {
  await showCustomAlert('请稍候...', '正在召唤买家秀大军...');
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) {
    alert('请先配置API！');
    return;
  }

  const product = await db.taobaoProducts.get(productId);
  if (!product) return;

  const prompt = `
# 任务
你是一位专业的电商评论生成器。请你为以下商品生成3-5条风格各异的模拟买家评价。

# 商品信息
- 名称: ${product.name}
- 价格: ${product.price}元
- 分类: ${product.category || '未分类'}

# 核心规则
1.  **风格多样**: 生成的评论应包含不同风格，例如：
    -   **好评**: 详细夸赞商品的某个优点。
    -   **中评/追评**: 描述使用一段时间后的感受，可能提到一些小瑕疵。
    -   **差评**: 吐槽商品的某个缺点，但语气要像真实买家。
    -   **搞笑评论**: 写一些幽默风趣的评论。
    -   **简洁评论**: 例如“好评”、“还行”、“物流很快”。
2.  **昵称真实**: 评论的作者昵称 ("author") 必须是随机的、生活化的、符合购物App用户习惯的。例如：“匿名用户”、“小王不吃香菜”、“可乐爱好者”。
3.  **格式铁律**: 你的回复【必须且只能】是一个严格的JSON数组，每个对象代表一条评论，并包含 "author" 和 "text" 两个字段。

# JSON输出格式示例:
[
  { "author": "匿名用户", "text": "物流很快，包装也很好，宝贝跟描述的一样，好评！" },
  { "author": "是小张呀", "text": "有点色差，不过还能接受。先用用看，过段时间再来追评。" }
]
`;
  try {
    const messagesForApi = [{ role: 'user', content: prompt }];
    let isGemini = proxyUrl === GEMINI_API_URL;
    let geminiConfig = toGeminiRequestData(model, apiKey, prompt, messagesForApi, isGemini);

    const response = isGemini
      ? await fetch(geminiConfig.url, geminiConfig.data)
      : await fetch(`${proxyUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model,
            messages: messagesForApi,
            temperature: parseFloat(state.apiConfig.temperature) || 1.0,
            response_format: { type: 'json_object' },
          }),
        });

    if (!response.ok) throw new Error(`API请求失败: ${await response.text()}`);

    const data = await response.json();
    const rawContent = isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
    const cleanedContent = rawContent.replace(/^```json\s*|```$/g, '').trim();
    const newReviews = JSON.parse(cleanedContent);

    if (Array.isArray(newReviews) && newReviews.length > 0) {
      // 将AI生成的评价保存到商品数据中
      await db.taobaoProducts.update(productId, { reviews: newReviews });
      await showCustomAlert('生成成功！', `已成功生成 ${newReviews.length} 条评价。`);
      // 重新打开详情页，刷新显示
      await openProductDetail(productId);
    } else {
      throw new Error('AI返回的数据格式不正确。');
    }
  } catch (error) {
    console.error('生成商品评价失败:', error);
    await showCustomAlert('生成失败', `发生错误: ${error.message}`);
  }
}
// ▲▲▲ 新增功能函数结束 ▲▲▲

// ▼▼▼ 用这块【已集成物流】的代码，替换旧的 handleCheckout 函数 ▼▼▼
/**
 * 【全新】结算购物车
 */
async function handleCheckout() {
  const checkoutBtn = document.getElementById('checkout-btn');
  const totalPrice = parseFloat(checkoutBtn.dataset.totalPrice);

  if (totalPrice <= 0) return;

  const currentBalance = state.globalSettings.userBalance || 0;
  if (currentBalance < totalPrice) {
    alert('余额不足！请先去“我的”页面充值。');
    return;
  }

  const confirmed = await showCustomConfirm('确认支付', `本次将花费 ¥${totalPrice.toFixed(2)}，确定要结算吗？`, {
    confirmText: '立即支付',
  });

  if (confirmed) {
    const cartItems = await db.taobaoCart.toArray();
    const productPromises = cartItems.map(item => db.taobaoProducts.get(item.productId));
    const productsInCart = await Promise.all(productPromises);
    const validProducts = productsInCart.filter(Boolean);

    let description = '购买商品: ';
    const itemNames = validProducts.map(p => `“${p.name}”`);
    if (itemNames.length > 2) {
      description += itemNames.slice(0, 2).join('、') + ` 等${itemNames.length}件商品`;
    } else {
      description += itemNames.join('、');
    }

    await updateUserBalanceAndLogTransaction(-totalPrice, description);

    // ★★★ 核心修改：为每个订单创建物流历史起点 ★★★
    const newOrders = cartItems.map((item, index) => ({
      productId: item.productId,
      quantity: item.quantity,
      timestamp: Date.now() + index, // 订单创建时间
      status: '已付款，等待发货',
      // 我们不再需要在数据库里存 logisticsHistory，因为它是动态模拟的
    }));

    await db.taobaoOrders.bulkAdd(newOrders);
    await db.taobaoCart.clear();
    await renderTaobaoCart();

    alert('支付成功！宝贝正在火速打包中~');
    switchTaobaoView('orders-view');
  }
}
// ▲▲▲ 替换结束 ▲▲▲

// ▼▼▼ 用这块【修改后】的代码，替换旧的 renderTaobaoProducts 函数 ▼▼▼

/**
 * 【V4 | 顺序生图版】渲染商品列表，按需生成并永久保存图片
 */
async function renderTaobaoProducts(category = null) {
  const gridEl = document.getElementById('product-grid');
  gridEl.innerHTML = '';

  const allProducts = await db.taobaoProducts.orderBy('name').toArray();
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

  // (这部分渲染分类tab的代码保持不变)
  // ...

  const productsToRender = category ? allProducts.filter(p => p.category === category) : allProducts;

  if (productsToRender.length === 0) {
    gridEl.innerHTML =
      '<p style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary);">还没有商品哦，点击右上角“+”添加吧！</p>';
    return;
  }

  productsToRender.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;

    card.innerHTML = `
        <div class="product-image-container">
            <!-- 图片或加载动画将在这里 -->
        </div>
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price.toFixed(2)}</div>
        </div>
    `;

    const imageContainer = card.querySelector('.product-image-container');

    if (product.imageUrl) {
      imageContainer.innerHTML = `<img src="${product.imageUrl}" class="product-image" alt="${product.name}">`;
    } else {
      imageContainer.innerHTML = `<div class="loading-spinner"></div>`;
      // ★★★ 核心修改1：不再直接调用，而是将任务添加到队列 ★★★
      imageGenerationQueue.push({ type: 'taobao', item: product });
    }

    addLongPressListener(card, () => showProductActions(product.id));
    gridEl.appendChild(card);
  });

  // ★★★ 核心修改2：渲染完所有卡片后，触发一次队列处理器 ★★★
  processImageQueue();
}

// ▲▲▲ 替换结束 ▲▲▲

/**
 * 渲染“我的订单”列表
 */
async function renderTaobaoOrders() {
  const listEl = document.getElementById('order-list');
  listEl.innerHTML = '';
  const orders = await db.taobaoOrders.reverse().sortBy('timestamp');

  if (orders.length === 0) {
    listEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">还没有任何订单记录</p>';
    return;
  }

  for (const order of orders) {
    const product = await db.taobaoProducts.get(order.productId);
    if (!product) continue;

    const item = document.createElement('div');
    item.className = 'order-item';
    item.dataset.orderId = order.id;
    item.innerHTML = `
            <img src="${product.imageUrl}" class="product-image">
            <div class="order-info">
                <div class="product-name">${product.name}</div>
                <div class="order-status">${order.status}</div>
                <div class="order-time">${new Date(order.timestamp).toLocaleString()}</div>
            </div>
        `;
    listEl.appendChild(item);
  }
}

/**
 * 渲染“我的”页面的余额
 */
function renderTaobaoBalance() {
  const balance = state.globalSettings.userBalance || 0;
  document.getElementById('user-balance-display').textContent = `¥ ${balance.toFixed(2)}`;
}

/**
 * 打开添加商品的方式选择弹窗
 */
function openAddProductChoiceModal() {
  document.getElementById('add-product-choice-modal').classList.add('visible');
}

/**
 * 打开手动添加/编辑商品的弹窗
 */
function openProductEditor(productId = null) {
  currentEditingProductId = productId;
  const modal = document.getElementById('product-editor-modal');
  const titleEl = document.getElementById('product-editor-title');

  if (productId) {
    titleEl.textContent = '编辑商品';
    // (异步) 加载现有商品数据
    db.taobaoProducts.get(productId).then(product => {
      if (product) {
        document.getElementById('product-name-input').value = product.name;
        document.getElementById('product-price-input').value = product.price;
        document.getElementById('product-image-input').value = product.imageUrl;
        document.getElementById('product-category-input').value = product.category || '';
      }
    });
  } else {
    titleEl.textContent = '添加新商品';
    // 清空输入框
    document.getElementById('product-name-input').value = '';
    document.getElementById('product-price-input').value = '';
    document.getElementById('product-image-input').value = '';
    document.getElementById('product-category-input').value = '';
  }
  modal.classList.add('visible');
}

// ▼▼▼ 用这两块【新代码】分别替换旧的 saveProduct 和 saveFoodItem 函数 ▼▼▼
/**
 * 【V3 | AI生图版】保存手动添加或编辑的商品
 */
async function saveProduct() {
  const name = document.getElementById('product-name-input').value.trim();
  const price = parseFloat(document.getElementById('product-price-input').value);
  let imageUrl = document.getElementById('product-image-input').value.trim();
  const category = document.getElementById('product-category-input').value.trim();

  if (!name || isNaN(price) || price <= 0) {
    alert('请填写所有必填项（名称、有效价格）！');
    return;
  }

  // --- ★★★ 核心修改在这里 ★★★ ---
  // 如果用户没有提供图片链接，我们就保存一个空字符串。
  // 新的渲染逻辑会自动检测到空链接并触发AI生图。
  if (!imageUrl) {
    imageUrl = ''; // 设置为空，让渲染器去处理
  }
  // --- ▲▲▲ 修改结束 ▲▲▲

  const productData = { name, price, imageUrl, category };

  if (currentEditingProductId) {
    await db.taobaoProducts.update(currentEditingProductId, productData);
    alert('商品已更新！');
  } else {
    await db.taobaoProducts.add(productData);
    alert('新商品已添加！');
  }

  document.getElementById('product-editor-modal').classList.remove('visible');
  await renderTaobaoProducts();
  currentEditingProductId = null;
}

/**
 * 【AI生图版】保存手动添加的美食
 */
async function saveFoodItem() {
  const name = document.getElementById('product-name-input').value.trim();
  const price = parseFloat(document.getElementById('product-price-input').value);
  let imageUrl = document.getElementById('product-image-input').value.trim();
  const restaurant = document.getElementById('product-category-input').value.trim();

  if (!name || isNaN(price) || price <= 0) {
    alert('请填写美食名称和有效价格！');
    return;
  }

  // ★★★ 核心修改在这里 ★★★
  // 如果用户没有提供图片链接，我们就保存一个空字符串。
  // 这样新的渲染逻辑就会自动检测到并触发AI生图。
  if (!imageUrl) {
    imageUrl = ''; // 设置为空，让渲染器去处理
  }
  // ★★★ 修改结束 ★★★

  const foodData = { name, price, imageUrl, restaurant: restaurant || '私房小厨' };

  await db.elemeFoods.add(foodData);
  alert('新美食已添加！');

  document.getElementById('product-editor-modal').classList.remove('visible');
  await renderElemeFoods();
}

// ▲▲▲ 替换结束 ▲▲▲

/**
 * 打开识别链接的弹窗
 */
function openAddFromLinkModal() {
  document.getElementById('link-paste-area').value = '';
  document.getElementById('add-from-link-modal').classList.add('visible');
}

// ▼▼▼ 在 taobao.js 中，用这块【新代码】替换旧的 handleAddFromLink 函数 ▼▼▼

/**
 * 【V2 | AI生图版】核心功能：处理粘贴的分享文案
 */
async function handleAddFromLink() {
  const text = document.getElementById('link-paste-area').value;
  const nameMatch = text.match(/「(.+?)」/);

  if (!nameMatch || !nameMatch[1]) {
    alert('无法识别商品名称！请确保粘贴了包含「商品名」的完整分享文案。');
    return;
  }

  const name = nameMatch[1];
  document.getElementById('add-from-link-modal').classList.remove('visible');

  const priceStr = await showCustomPrompt(`商品: ${name}`, '请输入价格 (元):', '', 'number');
  if (priceStr === null) return;
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) {
    alert('请输入有效的价格！');
    return;
  }

  // --- ★★★ 核心修改在这里 ★★★ ---
  let imageUrl = await showCustomPrompt(`商品: ${name}`, '请输入图片链接 (URL, 可选，留空则由AI生成):');
  if (imageUrl === null) return;

  // 1. 如果用户没有输入图片链接
  if (!imageUrl || !imageUrl.trim()) {
    try {
      // 就调用我们的AI生图函数
      imageUrl = await generateImageForProduct(name);
    } catch (e) {
      console.error('调用生图函数时发生意外错误:', e);
      imageUrl = getRandomDefaultProductImage();
    }
  }
  // --- ▲▲▲ 修改结束 ▲▲▲

  const category = await showCustomPrompt(`商品: ${name}`, '请输入分类 (可选):');

  await db.taobaoProducts.add({ name, price, imageUrl, category: category || '' });
  await renderTaobaoProducts();
  alert('商品已通过链接添加成功！');
}

// ▲▲▲ 替换结束 ▲▲▲

// ▼▼▼ 在 taobao.js 中，用这块【V2.1 | 修复API调用】的代码替换旧的 handleSearchProductsAI 函数 ▼▼▼
/**
 * 【V2.1 | AI生图版】核心功能：根据用户搜索触发AI生成商品
 */
async function handleSearchProductsAI() {
  const searchTerm = productSearchInput.value.trim();
  if (!searchTerm) {
    alert('请输入你想搜索的商品！');
    return;
  }

  await showCustomAlert('请稍候...', `AI正在为你寻找关于“${searchTerm}”的灵感...`);
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) {
    alert('请先配置API！');
    return;
  }

  const prompt = `
# 任务
你是一个虚拟购物App“桃宝”的搜索引擎。请根据用户提供的【搜索关键词】，为Ta创作一个包含5-8件相关商品的列表。

# 用户搜索的关键词:
"${searchTerm}"

# 核心规则
1.  **高度相关**: 所有商品都必须与用户的搜索关键词 "${searchTerm}" 紧密相关。
2.  **商品多样性**: 即使是同一个主题，也要尽量展示不同款式、功能或角度的商品。
3.  **格式铁律**: 你的回复【必须且只能】是一个严格的JSON数组，每个对象代表一件商品，【必须】包含以下字段:
    -   \`"name"\`: 商品名称
    -   \`"price"\`: 价格 (数字)
    -   \`"category"\`: 商品分类
    -   \`"imagePrompt"\`: 一个详细的、用于文生图AI的【英文提示词】，描述这张商品的【产品展示图 (product shot)】。风格要求【干净、简约、纯色或渐变背景 (clean, minimalist, solid color background)】。

# JSON输出格式示例:
[
  {
    "name": "赛博朋克风发光数据线",
    "price": 69.9,
    "category": "数码配件",
    "imagePrompt": "A glowing cyberpunk style data cable, product shot, on a dark tech background, neon lights, high detail"
  }
]`;

  try {
    const messagesForApi = [{ role: 'user', content: prompt }];

    // ★★★ 核心修复：恢复对 Gemini 和 OpenAI 的兼容判断逻辑 ★★★
    const isGemini = proxyUrl === GEMINI_API_URL;
    const requestData = isGemini
      ? toGeminiRequestData(model, apiKey, prompt, messagesForApi, isGemini)
      : {
          url: `${proxyUrl}/v1/chat/completions`,
          options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: model,
              messages: messagesForApi,
              temperature: 0.8,
              response_format: { type: 'json_object' },
            }),
          },
        };

    const response = await fetch(requestData.url, requestData.options);

    if (!response.ok) throw new Error(`API请求失败: ${await response.text()}`);

    const data = await response.json();
    const rawContent = isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
    const cleanedContent = rawContent.replace(/^```json\s*|```$/g, '').trim();
    const newProducts = JSON.parse(cleanedContent);

    if (Array.isArray(newProducts) && newProducts.length > 0) {
      displayAiGeneratedProducts(newProducts, `AI为你找到了关于“${searchTerm}”的宝贝`);
    } else {
      throw new Error('AI没有找到相关的商品。');
    }
  } catch (error) {
    console.error('AI搜索商品失败:', error);
    await showCustomAlert('搜索失败', `发生错误: ${error.message}`);
  }
}

/**
 * 【V2 | AI生图版】UI函数：在弹窗中显示AI生成的商品列表，并异步加载图片
 * @param {Array} products - AI生成的商品对象数组
 * @param {string} title - 弹窗的标题
 */
function displayAiGeneratedProducts(products, title) {
  const modal = document.getElementById('ai-generated-products-modal');
  const titleEl = document.getElementById('ai-products-modal-title');
  const gridEl = document.getElementById('ai-product-results-grid');

  titleEl.textContent = title;
  gridEl.innerHTML = '';

  products.forEach((product, index) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.id = `ai-product-${index}`;

    // ▼▼▼ 在 displayAiGeneratedProducts 函数中 ▼▼▼

    // ★★★ 核心修复：在放入HTML属性前，先对JSON字符串进行转义，防止引号冲突 ★★★
    // 1. 将商品对象转换为JSON字符串
    const productJsonString = JSON.stringify(product);
    // 2. 将字符串中的单引号替换为HTML实体编码
    const safeProductJsonString = productJsonString.replace(/'/g, '&#39;');

    card.innerHTML = `
        <div class="product-image-container">
            <div class="loading-spinner"></div>
        </div>
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price.toFixed(2)}</div>
        </div>
        <button class="add-to-my-page-btn" data-product='${safeProductJsonString}'>+ 添加到我的桃宝</button>
    `;
    gridEl.appendChild(card);

    // --- ★★★ 核心修改：调用异步函数去加载图片 ★★★ ---
    // 这个函数会在后台默默生图，成功后再更新这张卡片
    loadAndDisplayAiProductImage(product, card);
  });

  modal.classList.add('visible');
}

/**
 * 【全新】辅助函数：为AI生成的单个商品卡片加载图片
 * @param {object} productData - 商品数据，包含 imagePrompt
 * @param {HTMLElement} cardElement - 对应的商品卡片DOM元素
 */
async function loadAndDisplayAiProductImage(productData, cardElement) {
  const imageContainer = cardElement.querySelector('.product-image-container');
  if (!imageContainer) return;

  try {
    // 1. 【联动】调用我们具备“无限重试”功能的图片生成函数，并传入AI给的专属Prompt
    const imageUrl = await generateAndLoadImage(productData.imagePrompt);

    // 2. 将生成好的图片URL【回写】到商品数据中，方便“添加到主页”时使用
    productData.imageUrl = imageUrl;
    const addButton = cardElement.querySelector('.add-to-my-page-btn');
    if (addButton) {
      addButton.dataset.product = JSON.stringify(productData);
    }

    // 3. 更新卡片UI，用生成的图片替换掉加载动画
    //    再次检查卡片是否还存在于页面上，防止用户过早关闭弹窗导致错误
    if (document.body.contains(imageContainer)) {
      imageContainer.innerHTML = `<img src="${imageUrl}" class="product-image" alt="${productData.name}">`;
    }
  } catch (error) {
    // 理论上，因为 generateAndLoadImage 是无限重试，这里很难被触发
    // 但为了代码健壮性，我们仍然处理这个万一
    console.error(`为商品 "${productData.name}" 生成图片失败:`, error);
    if (document.body.contains(imageContainer)) {
      imageContainer.innerHTML = `<span>图片加载失败</span>`;
    }
  }
}

// ▲▲▲ 替换结束 ▲▲▲

/**
 * 【V2.1 | AI生图版】核心功能：触发AI【随机】生成商品，并在弹窗中显示
 */
async function handleGenerateProductsAI() {
  await showCustomAlert('请稍候...', '正在请求AI生成一批有趣的商品...');
  const { proxyUrl, apiKey, model } = state.apiConfig;
  if (!proxyUrl || !apiKey || !model) {
    alert('请先配置API！');
    return;
  }

  const prompt = `
# 任务
你是一个虚拟购物App“桃宝”的商品策划师。请你创作一个包含5-8件商品的列表。

# 核心规则
1.  **商品多样性**: 商品必须有趣、多样，可以包含服装、零食、家居用品、虚拟物品等。
2.  **分类清晰**: 为每件商品设置一个合理的分类。
3.  **格式铁律**: 你的回复【必须且只能】是一个严格的JSON数组，每个对象代表一件商品，【必须】包含以下字段:
    -   \`"name"\`: 商品名称 (字符串)
    -   \`"price"\`: 价格 (数字)
    -   \`"category"\`: 商品分类 (字符串)
    -   \`"imagePrompt"\`: 一个详细的、用于文生图AI的【英文提示词】，描述这张商品的【产品展示图 (product shot)】。风格要求【干净、简约、纯色或渐变背景 (clean, minimalist, solid color background)】。

# JSON输出格式示例:
[
  {
    "name": "会发光的蘑菇小夜灯",
    "price": 49.9,
    "category": "家居",
    "imagePrompt": "A glowing mushroom-shaped night light, minimalist, product shot, studio lighting, simple gradient background, high detail, photorealistic"
  }
]`;

  try {
    const messagesForApi = [{ role: 'user', content: prompt }];

    // ★★★ 核心修复：恢复对 Gemini 和 OpenAI 的兼容判断逻辑 ★★★
    const isGemini = proxyUrl === GEMINI_API_URL;
    const requestData = isGemini
      ? toGeminiRequestData(model, apiKey, prompt, messagesForApi, isGemini)
      : {
          url: `${proxyUrl}/v1/chat/completions`,
          options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: model,
              messages: messagesForApi,
              temperature: 1.1,
              response_format: { type: 'json_object' },
            }),
          },
        };

    const response = await fetch(requestData.url, requestData.options);

    if (!response.ok) throw new Error(`API请求失败: ${await response.text()}`);

    const data = await response.json();
    const rawContent = isGemini ? data.candidates[0].content.parts[0].text : data.choices[0].message.content;
    const cleanedContent = rawContent.replace(/^```json\s*|```$/g, '').trim();
    const newProducts = JSON.parse(cleanedContent);

    if (Array.isArray(newProducts) && newProducts.length > 0) {
      displayAiGeneratedProducts(newProducts, 'AI随机生成了以下宝贝');
    } else {
      throw new Error('AI返回的数据格式不正确。');
    }
  } catch (error) {
    console.error('AI生成商品失败:', error);
    await showCustomAlert('生成失败', `发生错误: ${error.message}`);
  }
}

/**
 * 处理用户点击商品卡片的逻辑（购买）
 */
async function handleBuyProduct(productId) {
  const product = await db.taobaoProducts.get(productId);
  if (!product) return;

  const currentBalance = state.globalSettings.userBalance || 0;
  if (currentBalance < product.price) {
    alert('余额不足，先去“我的”页面充点钱吧！');
    return;
  }

  const confirmed = await showCustomConfirm(
    '确认购买',
    `确定要花费 ¥${product.price.toFixed(2)} 购买“${product.name}”吗？`,
    { confirmText: '立即支付' },
  );

  if (confirmed) {
    // 1. 扣除余额
    state.globalSettings.userBalance -= product.price;
    await db.globalSettings.put(state.globalSettings);

    // 2. 创建订单
    const newOrder = {
      productId: productId,
      timestamp: Date.now(),
      status: '已付款，等待发货',
    };
    await db.taobaoOrders.add(newOrder);

    // 模拟物流更新
    setTimeout(async () => {
      const orderToUpdate = await db.taobaoOrders.where({ timestamp: newOrder.timestamp }).first();
      if (orderToUpdate) {
        await db.taobaoOrders.update(orderToUpdate.id, { status: '已发货，运输中' });
      }
    }, 1000 * 10); // 10秒后更新为已发货

    alert('购买成功！你可以在“我的订单”中查看物流信息。');
    renderTaobaoBalance(); // 刷新余额显示
  }
}

/**
 * 长按商品时显示操作菜单
 */
async function showProductActions(productId) {
  const choice = await showChoiceModal('商品操作', [
    { text: '✏️ 编辑商品', value: 'edit' },
    { text: '🗑️ 删除商品', value: 'delete' },
  ]);

  if (choice === 'edit') {
    openProductEditor(productId);
  } else if (choice === 'delete') {
    const product = await db.taobaoProducts.get(productId);
    const confirmed = await showCustomConfirm('确认删除', `确定要删除商品“${product.name}”吗？`, {
      confirmButtonClass: 'btn-danger',
    });
    if (confirmed) {
      await db.taobaoProducts.delete(productId);
      await renderTaobaoProducts();
      alert('商品已删除。');
    }
  }
}
// ▼▼▼ 把这两块全新的函数，粘贴到 init() 函数的上方 ▼▼▼
/**
 * 【全新】长按饿了么美食时显示操作菜单
 * @param {number} foodId - 美食的ID
 */
async function showFoodActions(foodId) {
  const choice = await showChoiceModal('操作', [
    { text: '✏️ 编辑', value: 'edit' },
    { text: '🗑️ 删除', value: 'delete' },
  ]);

  if (choice === 'edit') {
    // 调用我们即将修改的、支持编辑的函数
    openFoodEditor(foodId);
  } else if (choice === 'delete') {
    const food = await db.elemeFoods.get(foodId);
    if (!food) return;
    const confirmed = await showCustomConfirm('确认删除', `确定要删除“${food.name}”吗？`, {
      confirmButtonClass: 'btn-danger',
    });
    if (confirmed) {
      await db.elemeFoods.delete(foodId);
      await renderElemeFoods(); // 重新渲染列表
      await showCustomAlert('删除成功', '该美食已从列表中移除。');
    }
  }
}

/**
 * 【全新】核心函数：更新用户余额并记录一笔交易
 * @param {number} amount - 交易金额 (正数为收入, 负数为支出)
 * @param {string} description - 交易描述 (例如: "转账给 XX", "收到 XX 的红包")
 */
async function updateUserBalanceAndLogTransaction(amount, description) {
  if (isNaN(amount)) return; // 安全检查

  // 确保余额是数字
  state.globalSettings.userBalance = (state.globalSettings.userBalance || 0) + amount;

  const newTransaction = {
    type: amount > 0 ? 'income' : 'expense',
    amount: Math.abs(amount),
    description: description,
    timestamp: Date.now(),
  };

  // 使用数据库事务，确保两步操作要么都成功，要么都失败
  await db.transaction('rw', db.globalSettings, db.userWalletTransactions, async () => {
    await db.globalSettings.put(state.globalSettings);
    await db.userWalletTransactions.add(newTransaction);
  });

  console.log(`用户钱包已更新: 金额=${amount.toFixed(2)}, 新余额=${state.globalSettings.userBalance.toFixed(2)}`);
}
/**
 * 【全新增强版】处理删除单条交易记录（收入或支出）
 * @param {number} transactionId - 要删除的交易记录的ID
 */
async function handleDeleteTransaction(transactionId) {
  // 1. 在弹出确认框之前，先从数据库获取这条记录的详细信息
  const transaction = await db.userWalletTransactions.get(transactionId);
  if (!transaction) {
    await showCustomAlert('错误', '找不到该条交易记录，可能已被删除。');
    return;
  }

  // ★★★ 核心修改1：根据记录类型，生成动态的、更清晰的提示信息 ★★★
  const actionText = transaction.type === 'income' ? '扣除' : '返还';
  const confirmMessage = `确定要删除这条【${
    transaction.type === 'income' ? '收入' : '支出'
  }】记录吗？<br><br>此操作会将 <strong>¥${transaction.amount.toFixed(2)}</strong> 从您的余额中**${actionText}**。`;

  const confirmed = await showCustomConfirm('确认删除', confirmMessage, {
    confirmButtonClass: 'btn-danger',
  });

  if (!confirmed) {
    return; // 如果用户取消，则不执行任何操作
  }

  try {
    // 2. 使用数据库事务来保证数据安全
    await db.transaction('rw', db.globalSettings, db.userWalletTransactions, async () => {
      // ★★★ 核心修改2：根据记录类型，决定是加余额还是减余额 ★★★
      if (transaction.type === 'income') {
        // 如果删除的是一笔收入，那么总余额应该减少
        state.globalSettings.userBalance -= transaction.amount;
      } else if (transaction.type === 'expense') {
        // 如果删除的是一笔支出，那么总余额应该增加（钱被“退回”了）
        state.globalSettings.userBalance += transaction.amount;
      }

      // 3. 更新全局设置
      await db.globalSettings.put(state.globalSettings);

      // 4. 从交易记录表中删除这条记录
      await db.userWalletTransactions.delete(transactionId);
    });

    // 5. 操作成功后，刷新UI
    await renderBalanceDetails();

    await showCustomAlert('操作成功', '该条记录已删除，余额已更新。');
  } catch (error) {
    console.error('删除交易记录时出错:', error);
    await showCustomAlert('操作失败', `发生错误: ${error.message}`);
  }
}

/**
 * 【全新 | V2版】渲染“我的”页面的余额和交易明细 (支持删除所有记录)
 */
async function renderBalanceDetails() {
  // 1. 渲染当前余额
  const balance = state.globalSettings.userBalance || 0;
  document.getElementById('user-balance-display').textContent = `¥ ${balance.toFixed(2)}`;

  // 2. 渲染交易明细列表
  const listEl = document.getElementById('balance-details-list');
  listEl.innerHTML = ''; // 清空旧列表

  const transactions = await db.userWalletTransactions.reverse().sortBy('timestamp');

  if (transactions.length === 0) {
    listEl.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary); margin-top: 20px;">还没有任何明细记录</p>';
    return;
  }

  // 给列表加个标题
  listEl.innerHTML = '<h3 style="margin-bottom: 10px; color: var(--text-secondary);">余额明细</h3>';

  transactions.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'transaction-item';
    const sign = item.type === 'income' ? '+' : '-';

    // ★★★ 核心修改：我们移除了 if 判断，现在为每一条记录都生成删除按钮 ★★★
    const deleteButtonHtml = `<button class="delete-transaction-btn" data-transaction-id="${item.id}">×</button>`;

    itemEl.innerHTML = `
            <div class="transaction-info">
                <div class="description">${item.description}</div>
                <div class="timestamp">${new Date(item.timestamp).toLocaleString()}</div>
            </div>
            <div class="transaction-amount-wrapper">
                <div class="transaction-amount ${item.type}">
                    ${sign} ${item.amount.toFixed(2)}
                </div>
                ${deleteButtonHtml} 
            </div>
        `;
    listEl.appendChild(itemEl);
  });
}

// ▼▼▼ 在 init() 函数的上方，粘贴下面这 3 个新函数 ▼▼▼

/**
 * 【全新】打开物流详情页面
 * @param {number} orderId - 被点击的订单ID
 */
async function openLogisticsView(orderId) {
  const order = await db.taobaoOrders.get(orderId);
  if (!order) {
    alert('找不到该订单！');
    return;
  }

  // 每次打开都先清空旧的计时器
  logisticsUpdateTimers.forEach(timerId => clearTimeout(timerId));
  logisticsUpdateTimers = [];

  // 显示物流页面，并开始渲染
  showScreen('logistics-screen');
  await renderLogisticsView(order);
}

/**
 * 【全新】渲染物流详情页面的所有内容
 * @param {object} order - 订单对象
 */
async function renderLogisticsView(order) {
  const contentArea = document.getElementById('logistics-content-area');
  contentArea.innerHTML = '加载中...';

  const product = await db.taobaoProducts.get(order.productId);
  if (!product) {
    contentArea.innerHTML = '无法加载商品信息。';
    return;
  }

  // 渲染顶部的商品信息卡片
  contentArea.innerHTML = `
        <div class="logistics-product-summary">
            <img src="${product.imageUrl}" class="product-image">
            <div class="info">
                <div class="name">${product.name} (x${order.quantity})</div>
                <div class="status" id="logistics-main-status">查询中...</div>
            </div>
        </div>
        <div class="logistics-timeline" id="logistics-timeline-container"></div>
    `;

  const timelineContainer = document.getElementById('logistics-timeline-container');
  const mainStatusEl = document.getElementById('logistics-main-status');
  const creationTime = order.timestamp; // 使用订单的创建时间作为起点

  // 准备一些随机城市名，让物流看起来更真实
  const cities = ['东莞', '广州', '长沙', '武汉', '郑州', '北京', '上海', '成都', '西安'];
  const startCity = getRandomItem(cities);
  let nextCity = getRandomItem(cities.filter(c => c !== startCity));
  const userCity = getRandomItem(cities.filter(c => c !== startCity && c !== nextCity)) || '您的城市';

  // --- 这就是模拟物流的核心 ---
  let cumulativeDelay = 0;
  logisticsTimelineTemplate.forEach(stepInfo => {
    cumulativeDelay += stepInfo.delay;
    const eventTime = creationTime + cumulativeDelay; // 计算出这个步骤“应该”发生的时间
    const now = Date.now();

    // 替换文本中的占位符
    const stepText = stepInfo.text
      .replace(/{city}/g, startCity)
      .replace('{next_city}', nextCity)
      .replace('{user_city}', userCity);

    // 如果这个步骤的发生时间已经过去或就是现在
    if (now >= eventTime) {
      // 就立即把它渲染到页面上
      addLogisticsStep(timelineContainer, mainStatusEl, stepText, eventTime, true);
    } else {
      // 否则，它就是一个“未来”的步骤
      const delayUntilEvent = eventTime - now; // 计算还有多久才发生
      // 设置一个定时器，在未来的那个时间点执行
      const timerId = setTimeout(() => {
        // 执行前再次检查用户是否还停留在物流页面
        if (document.getElementById('logistics-screen').classList.contains('active')) {
          addLogisticsStep(timelineContainer, mainStatusEl, stepText, eventTime, true);
        }
      }, delayUntilEvent);
      // 把这个定时器的ID存起来，方便离开页面时清除
      logisticsUpdateTimers.push(timerId);
    }
  });

  // 如果订单刚刚创建，可能还没有任何步骤满足时间条件，此时手动显示第一条
  if (timelineContainer.children.length === 0) {
    const firstStep = logisticsTimelineTemplate[0];
    const stepText = firstStep.text
      .replace(/{city}/g, startCity)
      .replace('{next_city}', nextCity)
      .replace('{user_city}', userCity);
    addLogisticsStep(timelineContainer, mainStatusEl, stepText, creationTime, true);
  }
}

/**
 * 【全新】在时间轴上添加一个物流步骤的辅助函数
 * @param {HTMLElement} container - 时间轴的DOM容器
 * @param {HTMLElement} mainStatusEl - 顶部主状态的DOM元素
 * @param {string} text - 物流信息文本
 * @param {number} timestamp - 该步骤发生的时间戳
 * @param {boolean} prepend - 是否添加到最前面（最新的步骤放前面）
 */
function addLogisticsStep(container, mainStatusEl, text, timestamp, prepend = false) {
  const stepEl = document.createElement('div');
  stepEl.className = 'logistics-step';
  stepEl.innerHTML = `
        <div class="logistics-step-content">
            <div class="status-text">${text}</div>
            <div class="timestamp">${new Date(timestamp).toLocaleString('zh-CN')}</div>
        </div>
    `;

  if (prepend) {
    container.prepend(stepEl); // 插入到最前面
    mainStatusEl.textContent = text; // 更新顶部的状态
  } else {
    container.appendChild(stepEl);
  }
}
// ▲▲▲ 粘贴结束 ▲▲▲
// ▼▼▼ 把这一整块全新的功能函数，粘贴到 init() 函数的正上方 ▼▼▼

/**
 * 【全新】处理角色手机钱包余额和交易记录的通用函数
 * @param {string} charId - 要更新钱包的角色ID
 * @param {number} amount - 交易金额 (正数为收入, 负数为支出)
 * @param {string} description - 交易描述
 */
async function updateCharacterPhoneBankBalance(charId, amount, description) {
  const chat = state.chats[charId];
  if (!chat || chat.isGroup) return;

  if (!chat.characterPhoneData) chat.characterPhoneData = {};
  if (!chat.characterPhoneData.bank) chat.characterPhoneData.bank = { balance: 0, transactions: [] };
  if (typeof chat.characterPhoneData.bank.balance !== 'number') chat.characterPhoneData.bank.balance = 0;

  chat.characterPhoneData.bank.balance += amount;

  const newTransaction = {
    type: amount > 0 ? '收入' : '支出',
    amount: Math.abs(amount),
    description: description,
    timestamp: Date.now(),
  };

  // 让最新的交易记录显示在最前面
  if (!Array.isArray(chat.characterPhoneData.bank.transactions)) {
    chat.characterPhoneData.bank.transactions = [];
  }
  chat.characterPhoneData.bank.transactions.unshift(newTransaction);

  await db.chats.put(chat);
  console.log(
    `✅ 角色[${chat.name}]钱包已更新: 金额=${amount.toFixed(2)}, 新余额=${chat.characterPhoneData.bank.balance.toFixed(
      2,
    )}`,
  );
}

/**
 * 【全新】打开一个单选的角色选择器，让用户选择一个代付对象
 * @returns {Promise<string|null>} - 返回选中的角色ID，如果取消则返回null
 */
async function openCharSelectorForCart() {
  return new Promise(resolve => {
    // 复用分享功能的弹窗，很方便
    const modal = document.getElementById('share-target-modal');
    const listEl = document.getElementById('share-target-list');
    const titleEl = document.getElementById('share-target-modal-title');
    const confirmBtn = document.getElementById('confirm-share-target-btn');
    const cancelBtn = document.getElementById('cancel-share-target-btn');

    titleEl.textContent = '分享给谁代付？';
    listEl.innerHTML = '';

    const singleChats = Object.values(state.chats).filter(c => !c.isGroup);

    if (singleChats.length === 0) {
      alert('你还没有任何可以分享的好友哦。');
      modal.classList.remove('visible');
      resolve(null);
      return;
    }

    // 使用 radio 单选按钮
    singleChats.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'contact-picker-item';
      item.innerHTML = `
                <input type="radio" name="cart-share-target" value="${chat.id}" id="target-${
        chat.id
      }" style="margin-right: 15px;">
                <label for="target-${chat.id}" style="display:flex; align-items:center; width:100%; cursor:pointer;">
                    <img src="${chat.settings.aiAvatar || defaultAvatar}" class="avatar">
                    <span class="name">${chat.name}</span>
                </label>
            `;
      listEl.appendChild(item);
    });

    modal.classList.add('visible');

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const cleanup = () => modal.classList.remove('visible');

    newConfirmBtn.onclick = () => {
      const selectedRadio = document.querySelector('input[name="cart-share-target"]:checked');
      if (selectedRadio) {
        cleanup();
        resolve(selectedRadio.value);
      } else {
        alert('请选择一个代付对象！');
      }
    };

    newCancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };
  });
}

/**
 * 【全新】清空桃宝购物车
 */
async function clearTaobaoCart() {
  await db.taobaoCart.clear();
  await renderTaobaoCart();
  updateCartBadge();
}

/**
 * 【全新】根据购物车内容创建订单
 * @param {Array} cartItems - 购物车项目数组
 */
async function createOrdersFromCart(cartItems) {
  if (!cartItems || cartItems.length === 0) return;
  const newOrders = cartItems.map((item, index) => ({
    productId: item.productId,
    quantity: item.quantity,
    timestamp: Date.now() + index, // 防止时间戳完全相同
    status: '已付款，等待发货',
  }));
  await db.taobaoOrders.bulkAdd(newOrders);
  // 简单模拟物流更新
  setTimeout(async () => {
    const ordersToUpdate = await db.taobaoOrders.where('status').equals('已付款，等待发货').toArray();
    for (const order of ordersToUpdate) {
      await db.taobaoOrders.update(order.id, { status: '已发货，运输中' });
    }
  }, 1000 * 10);
}

// ▼▼▼ 请用下面这整块【修复后】的代码，完整替换掉你旧的 handleShareCart 函数 ▼▼▼

/**
 * 【全新总入口 | 已修复备注名】处理“分享给Ta代付”的全部逻辑
 */
async function handleShareCart() {
  const cartItems = await db.taobaoCart.toArray();
  if (cartItems.length === 0) {
    alert('购物车是空的，先去加点宝贝吧！');
    return;
  }

  const targetChatId = await openCharSelectorForCart();
  if (!targetChatId) return;

  const char = state.chats[targetChatId];
  if (!char) return;

  let totalPrice = 0;
  const productPromises = cartItems.map(item => db.taobaoProducts.get(item.productId));
  const products = await Promise.all(productPromises);
  cartItems.forEach((item, index) => {
    const product = products[index];
    if (product) {
      totalPrice += product.price * item.quantity;
    }
  });

  const charBalance = char.characterPhoneData?.bank?.balance || 0;
  if (charBalance < totalPrice) {
    await showCustomAlert(
      '代付失败',
      `“${char.name}”的钱包余额不足！\n需要 ¥${totalPrice.toFixed(2)}，但余额只有 ¥${charBalance.toFixed(2)}。`,
    );
    return;
  }

  const confirmed = await showCustomConfirm(
    '确认代付',
    `将分享购物车给“${char.name}”并请求代付，共计 ¥${totalPrice.toFixed(
      2,
    )}。\n这将会清空你的购物车，并从Ta的钱包扣款。确定吗？`,
    { confirmText: '确定' },
  );

  if (!confirmed) return;

  await showCustomAlert('处理中...', '正在通知Ta代付并下单...');

  // --- ▼▼▼ 这就是本次的核心修改 ▼▼▼ ---

  // 1. 获取角色的手机数据，准备查找备注名
  const characterPhoneData = char.characterPhoneData || { chats: {} };

  // 2. 在角色的联系人中，找到代表“用户”的那个联系人对象
  //    （通常是那个没有聊天记录的特殊联系人条目）
  const userContactInData = Object.values(characterPhoneData.chats || {}).find(
    c => !c.history || c.history.length === 0,
  );

  // 3. 获取角色给用户的备注名，如果没设置，就默认用“我”
  const remarkForUser = userContactInData ? userContactInData.remarkName : '我';

  // 4. 使用这个新的备注名来创建交易记录
  const description = `为“${remarkForUser}”的桃宝购物车买单`;
  await updateCharacterPhoneBankBalance(targetChatId, -totalPrice, description);

  // --- ▲▲▲ 修改结束 ▲▲▲ ---

  await createOrdersFromCart(cartItems);

  const itemsSummary = products.map((p, i) => `${p.name} x${cartItems[i].quantity}`).join('、 ');

  // 给AI看的隐藏指令，告诉它发生了什么
  const hiddenMessage = {
    role: 'system',
    content: `[系统提示：用户刚刚与你分享了TA的购物车，并请求你为总价为 ¥${totalPrice.toFixed(
      2,
    )} 的商品付款。你已经同意并支付了，你的钱包余额已被扣除。商品包括：${itemsSummary}。请根据你的人设对此作出回应，例如表示宠溺、抱怨花钱太多或者询问买了什么。]`,
    timestamp: Date.now(),
    isHidden: true,
  };
  char.history.push(hiddenMessage);
  await db.chats.put(char);

  await clearTaobaoCart();

  await showCustomAlert('操作成功', `“${char.name}”已成功为你买单！`);
  renderChatList();

  openChat(targetChatId); // 跳转到聊天界面
  triggerAiResponse(); // 让AI回应这次代付
}

// ▲▲▲ 替换结束 ▲▲▲

// ▼▼▼ 把下面这两块全新的函数，粘贴到你的JS功能函数定义区 ▼▼▼

/**
 * 【全新】处理“为Ta购买”的全部逻辑
 */
async function handleBuyForChar() {
  const cartItems = await db.taobaoCart.toArray();
  if (cartItems.length === 0) {
    alert('购物车是空的，先去加点宝贝吧！');
    return;
  }

  const targetChatId = await openCharSelectorForCart();
  if (!targetChatId) return; // 用户取消选择

  const char = state.chats[targetChatId];
  if (!char) return;

  let totalPrice = 0;
  const productPromises = cartItems.map(item => db.taobaoProducts.get(item.productId));
  const products = await Promise.all(productPromises);
  products.forEach((product, index) => {
    if (product) {
      totalPrice += product.price * cartItems[index].quantity;
    }
  });

  // 检查用户余额
  if ((state.globalSettings.userBalance || 0) < totalPrice) {
    alert(
      `余额不足！本次需要 ¥${totalPrice.toFixed(2)}，但你的余额只有 ¥${(state.globalSettings.userBalance || 0).toFixed(
        2,
      )}。`,
    );
    return;
  }

  const confirmed = await showCustomConfirm(
    '确认赠送',
    `确定要花费 ¥${totalPrice.toFixed(2)} 为“${char.name}”购买购物车中的所有商品吗？`,
    { confirmText: '为Ta买单' },
  );

  if (confirmed) {
    await showCustomAlert('正在处理...', '正在为你心爱的Ta下单...');

    // 1. 扣除用户余额
    await updateUserBalanceAndLogTransaction(-totalPrice, `为 ${char.name} 购买商品`);

    // 2. 将购物车内容转化为订单（记录在你的订单里）
    await createOrdersFromCart(cartItems);

    // 3. 发送礼物通知给对方
    await sendGiftNotificationToChar(targetChatId, products, cartItems, totalPrice);

    // 4. 清空购物车
    await clearTaobaoCart();

    await showCustomAlert('赠送成功！', `你为“${char.name}”购买的礼物已下单，并已通过私信通知对方啦！`);
    renderChatList(); // 刷新列表，显示未读消息
  }
}

// ▼▼▼ 用这块【新代码】替换旧的 sendGiftNotificationToChar 函数 ▼▼▼
// ▼▼▼ 把下面这两块全新的函数，粘贴到你的JS功能函数定义区 ▼▼▼

/**
 * 【全新】处理“为Ta购买”的全部逻辑
 */
async function handleBuyForChar() {
  const cartItems = await db.taobaoCart.toArray();
  if (cartItems.length === 0) {
    alert('购物车是空的，先去加点宝贝吧！');
    return;
  }

  const targetChatId = await openCharSelectorForCart();
  if (!targetChatId) return; // 用户取消选择

  const char = state.chats[targetChatId];
  if (!char) return;

  let totalPrice = 0;
  const productPromises = cartItems.map(item => db.taobaoProducts.get(item.productId));
  const products = await Promise.all(productPromises);
  products.forEach((product, index) => {
    if (product) {
      totalPrice += product.price * cartItems[index].quantity;
    }
  });

  // 检查用户余额
  if ((state.globalSettings.userBalance || 0) < totalPrice) {
    alert(
      `余额不足！本次需要 ¥${totalPrice.toFixed(2)}，但你的余额只有 ¥${(state.globalSettings.userBalance || 0).toFixed(
        2,
      )}。`,
    );
    return;
  }

  const confirmed = await showCustomConfirm(
    '确认赠送',
    `确定要花费 ¥${totalPrice.toFixed(2)} 为“${char.name}”购买购物车中的所有商品吗？`,
    { confirmText: '为Ta买单' },
  );

  if (confirmed) {
    await showCustomAlert('正在处理...', '正在为你心爱的Ta下单...');

    // 1. 扣除用户余额
    await updateUserBalanceAndLogTransaction(-totalPrice, `为 ${char.name} 购买商品`);

    // 2. 将购物车内容转化为订单（记录在你的订单里）
    await createOrdersFromCart(cartItems);

    // 3. 发送礼物通知给对方
    await sendGiftNotificationToChar(targetChatId, products, cartItems, totalPrice);

    // 4. 清空购物车
    await clearTaobaoCart();

    await showCustomAlert('赠送成功！', `你为“${char.name}”购买的礼物已下单，并已通过私信通知对方啦！`);
    renderChatList(); // 刷新列表，显示未读消息
  }
}

// ▼▼▼ 用这块【最终正确版】代码，完整替换旧的 sendGiftNotificationToChar 函数 ▼▼▼

/**
 * 【全新 | 最终正确版】发送礼物通知到指定角色的聊天
 * 效果：发送一条本质是文本、但外观是卡片的消息。
 *      - 用户界面显示为漂亮的礼物卡片。
 *      - 消息数据中包含完整的文本信息。
 *      - AI 仍然通过隐藏的系统指令接收信息。
 */
async function sendGiftNotificationToChar(targetChatId, products, cartItems, totalPrice) {
  const chat = state.chats[targetChatId];
  if (!chat) return;

  const itemsSummary = products.map((p, i) => `${p.name} x${cartItems[i].quantity}`).join('、');

  // 1. 【核心】先准备好这条消息的“文本内容”
  const messageTextContent = `我给你买了新礼物，希望你喜欢！\n商品清单：${itemsSummary}\n合计：¥${totalPrice.toFixed(
    2,
  )}`;

  // 2. 创建对用户【可见】的消息对象。现在它同时拥有 “文本内容” 和 “卡片样式指令”
  const visibleMessage = {
    role: 'user',

    // 【核心修改】为这条消息添加一个 content 属性，这就是它的“文本本体”
    // 当你复制这条消息时，复制出来的内容就是这个。
    content: messageTextContent,

    // 同时保留 type 和 payload，它们告诉渲染器“把这条消息画成卡片”
    type: 'gift_notification',
    timestamp: Date.now(),
    payload: {
      senderName: state.qzoneSettings.nickname || '我',
      itemSummary: itemsSummary,
      totalPrice: totalPrice,
      itemCount: cartItems.length,
    },
  };
  chat.history.push(visibleMessage);

  // 3. 【这部分不变】创建一条给AI看的【隐藏】指令，确保AI能理解并回应
  const hiddenMessage = {
    role: 'system',
    content: `[系统指令：用户刚刚为你购买了${cartItems.length}件商品，总价值为${totalPrice.toFixed(
      2,
    )}元。商品包括：${itemsSummary}。请根据你的人设对此表示感谢或作出其他反应。]`,
    timestamp: Date.now() + 1,
    isHidden: true,
  };
  chat.history.push(hiddenMessage);

  // 4. 【这部分不变】未读消息只增加1条
  chat.unreadCount = (chat.unreadCount || 0) + 1;
  await db.chats.put(chat);

  // 5. 【这部分不变】发送横幅通知
  if (state.activeChatId !== targetChatId) {
    showNotification(targetChatId, '你收到了一份礼物！');
  }
}
// ▲▲▲ 替换结束 ▲▲▲

// ▼▼▼ 【全新】购物车代付功能核心函数 ▼▼▼

/**
 * 【全新总入口 | 无隐藏消息版】处理用户点击“分享给Ta代付”按钮的逻辑
 */
async function handleShareCartRequest() {
  const cartItems = await db.taobaoCart.toArray();
  if (cartItems.length === 0) {
    alert('购物车是空的，先去加点宝贝吧！');
    return;
  }

  const targetChatId = await openCharSelectorForCart();
  if (!targetChatId) return;

  const chat = state.chats[targetChatId];
  if (!chat) return;

  let totalPrice = 0;
  const productPromises = cartItems.map(item => db.taobaoProducts.get(item.productId));
  const products = await Promise.all(productPromises);
  const itemsSummary = products
    .map((p, i) => {
      if (p) {
        totalPrice += p.price * cartItems[i].quantity;
        return `${p.name} x${cartItems[i].quantity}`;
      }
      return '';
    })
    .filter(Boolean)
    .join('、 ');

  const charBalance = chat.characterPhoneData?.bank?.balance || 0;

  const confirmed = await showCustomConfirm(
    '确认代付请求',
    `将向“${chat.name}”发起购物车代付请求，共计 ¥${totalPrice.toFixed(2)}。`,
    { confirmText: '发送请求' },
  );

  if (!confirmed) return;

  // --- ▼▼▼【核心修改】在这里，我们只创建一条消息 ▼▼▼ ---

  // 1. 直接将所有信息都放入 content 字段，让用户也能看到
  const requestContent = `[购物车代付请求]
总金额: ¥${totalPrice.toFixed(2)}
商品: ${itemsSummary}
(你的当前余额: ¥${charBalance.toFixed(2)})
请使用 'cart_payment_response' 指令回应。`;

  // 2. 创建一条普通的用户消息，不再有 isHidden 标记
  const requestMessage = {
    role: 'user', // 由用户发出
    type: 'cart_share_request', // 类型保持不变，用于UI渲染
    timestamp: Date.now(),
    content: requestContent, // 将包含所有信息的文本作为内容
    payload: {
      // payload 依然保留，用于UI渲染卡片
      totalPrice: totalPrice,
      itemCount: cartItems.length,
      status: 'pending',
    },
  };

  // 3. 将这条【单一的】消息添加到历史记录
  chat.history.push(requestMessage);

  // --- ▲▲▲ 修改结束 ▲▲▲ ---

  await db.chats.put(chat);

  await showCustomAlert('请求已发送', `已将代付请求发送给“${chat.name}”，请在聊天中查看TA的回应。`);

  openChat(targetChatId);
}

/**
 * 【辅助函数】打开一个单选的角色选择器，让用户选择代付对象
 * (这个函数复用了分享功能的弹窗，稍作修改)
 */
async function openCharSelectorForCart() {
  return new Promise(resolve => {
    const modal = document.getElementById('share-target-modal');
    const listEl = document.getElementById('share-target-list');
    const titleEl = document.getElementById('share-target-modal-title');
    const confirmBtn = document.getElementById('confirm-share-target-btn');
    const cancelBtn = document.getElementById('cancel-share-target-btn');

    titleEl.textContent = '分享给谁代付？';
    listEl.innerHTML = '';

    const singleChats = Object.values(state.chats).filter(c => !c.isGroup);

    if (singleChats.length === 0) {
      alert('你还没有任何可以分享的好友哦。');
      modal.classList.remove('visible');
      resolve(null);
      return;
    }

    // 使用 radio 单选按钮
    singleChats.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'contact-picker-item';
      item.innerHTML = `
                <input type="radio" name="cart-share-target" value="${chat.id}" id="target-${
        chat.id
      }" style="margin-right: 15px;">
                <label for="target-${chat.id}" style="display:flex; align-items:center; width:100%; cursor:pointer;">
                    <img src="${chat.settings.aiAvatar || defaultAvatar}" class="avatar">
                    <span class="name">${chat.name}</span>
                </label>
            `;
      listEl.appendChild(item);
    });

    modal.classList.add('visible');

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const cleanup = () => modal.classList.remove('visible');

    newConfirmBtn.onclick = () => {
      const selectedRadio = document.querySelector('input[name="cart-share-target"]:checked');
      if (selectedRadio) {
        cleanup();
        resolve(selectedRadio.value);
      } else {
        alert('请选择一个代付对象！');
      }
    };

    newCancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };
  });
}

/**
 * 【辅助函数】清空用户的桃宝购物车
 */
async function clearTaobaoCart() {
  await db.taobaoCart.clear();
  updateCartBadge();
  // 如果用户正好在看购物车，就刷新一下
  if (document.getElementById('cart-view').classList.contains('active')) {
    renderTaobaoCart();
  }
}

/**
 * 【辅助函数】根据购物车内容创建订单
 * @param {Array} cartItems - 从数据库读出的购物车项目数组
 */
async function createOrdersFromCart(cartItems) {
  if (!cartItems || cartItems.length === 0) return;
  const newOrders = cartItems.map((item, index) => ({
    productId: item.productId,
    quantity: item.quantity,
    timestamp: Date.now() + index, // 防止时间戳完全相同
    status: '已付款，等待发货',
  }));
  await db.taobaoOrders.bulkAdd(newOrders);

  // 模拟10秒后自动发货
  setTimeout(async () => {
    const orderIds = newOrders.map(order => order.timestamp);
    const ordersToUpdate = await db.taobaoOrders.where('timestamp').anyOf(orderIds).toArray();
    for (const order of ordersToUpdate) {
      await db.taobaoOrders.update(order.id, { status: '已发货，运输中' });
    }
    console.log(`${ordersToUpdate.length} 个新订单状态已更新为“已发货”。`);
  }, 1000 * 10);
}

// ▲▲▲ 新功能函数结束 ▲▲▲

/* --- “桃宝”App 功能函数结束 --- */
function initTaobao() {
  // ▼▼▼ 把这一整块全新的事件监听器代码，粘贴到 init() 的事件监听器区域末尾 ▼▼▼

  /* --- 【全新】“桃宝”App 事件监听器 --- */

  // 1. 绑定主屏幕的App图标
  document.getElementById('taobao-app-icon').addEventListener('click', openTaobaoApp);
  // 绑定新加的“清空”按钮
  document.getElementById('clear-taobao-products-btn').addEventListener('click', clearTaobaoProducts);
  // ▼▼▼ 在 init() 的事件监听区域末尾，粘贴下面这整块新代码 ▼▼▼

  /* --- 【全新】桃宝购物车功能事件监听器 --- */

  // 1. 绑定App内部的页签切换
  document.querySelector('.taobao-tabs').addEventListener('click', e => {
    if (e.target.classList.contains('taobao-tab')) {
      switchTaobaoView(e.target.dataset.view);
    }
  });

  // 使用事件委托，统一处理桃宝所有页面的点击事件
  document.getElementById('taobao-screen').addEventListener('click', async e => {
    const target = e.target;

    // --- 桃宝首页 ---
    if (target.closest('#products-view')) {
      const productCard = target.closest('.product-card');
      // 如果点击的是商品卡片本身（而不是添加购物车按钮）
      if (productCard && !target.classList.contains('add-cart-btn')) {
        // 调用桃宝的详情函数
        await openProductDetail(parseInt(productCard.dataset.productId));
      }
      // 如果点击的是添加购物车按钮
      else if (target.classList.contains('add-cart-btn')) {
        await handleAddToCart(parseInt(target.dataset.productId));
      }
      // 如果点击的是分类页签
      else if (target.closest('.category-tab-btn')) {
        const category =
          target.closest('.category-tab-btn').dataset.category === 'all'
            ? null
            : target.closest('.category-tab-btn').dataset.category;
        await renderTaobaoProducts(category);
      }
    }

    // --- 饿了么页 (★★★★★ 核心修复在这里 ★★★★★) ---
    else if (target.closest('#eleme-view')) {
      // 处理顶部的几个功能按钮
      if (target.closest('#eleme-search-btn')) {
        handleSearchFoodsAI();
      } else if (target.closest('#eleme-add-manual-btn')) {
        openFoodEditor();
      } else if (target.closest('#eleme-generate-ai-btn')) {
        handleGenerateFoodsAI();
      }
      // 【关键修复】处理美食卡片的点击
      else {
        const foodCard = target.closest('.product-card');
        if (foodCard) {
          const foodId = parseInt(foodCard.dataset.foodId);
          if (!isNaN(foodId)) {
            // ★★★ 当在饿了么页面点击卡片时，确保调用的是 openFoodDetail 函数！ ★★★
            await openFoodDetail(foodId);
          }
        }
      }
    }

    // --- 购物车页 ---
    else if (target.closest('#cart-view')) {
      if (target.closest('.cart-item-info') || target.classList.contains('product-image')) {
        const cartItem = target.closest('.cart-item');
        if (cartItem) {
          // 这里虽然也打开商品详情，但是从购物车点进去是合理的
          const productId =
            parseInt(cartItem.querySelector('.delete-cart-item-btn').dataset.productId) ||
            parseInt(target.dataset.productId);
          await openProductDetail(productId);
        }
      } else if (target.classList.contains('quantity-increase')) {
        await handleChangeCartItemQuantity(parseInt(target.dataset.cartId), 1);
      } else if (target.classList.contains('quantity-decrease')) {
        await handleChangeCartItemQuantity(parseInt(target.dataset.cartId), -1);
      } else if (target.classList.contains('delete-cart-item-btn')) {
        const confirmed = await showCustomConfirm('移出购物车', '确定要删除这个宝贝吗？');
        if (confirmed) await handleRemoveFromCart(parseInt(target.dataset.cartId));
      } else if (target.id === 'checkout-btn') {
        await handleCheckout();
      } else if (target.id === 'share-cart-to-char-btn') {
        await handleShareCartRequest();
      } else if (target.id === 'buy-for-char-btn') {
        await handleBuyForChar();
      }
    }

    // --- 订单页 ---
    else if (target.closest('#orders-view')) {
      const orderItem = target.closest('.order-item');
      if (orderItem) await openLogisticsView(parseInt(orderItem.dataset.orderId));
    }

    // --- 我的页面 ---
    else if (target.closest('#my-view')) {
      if (target.id === 'top-up-btn') {
        const amountStr = await showCustomPrompt('充值', '请输入要充值的金额 (元):', '', 'number');
        if (amountStr !== null) {
          const amount = parseFloat(amountStr);
          if (!isNaN(amount) && amount > 0) {
            await updateUserBalanceAndLogTransaction(amount, '充值');
            await renderBalanceDetails();
            alert(`成功充值 ¥${amount.toFixed(2)}！`);
          } else {
            alert('请输入有效的金额！');
          }
        }
      } else if (target.classList.contains('delete-transaction-btn')) {
        await handleDeleteTransaction(parseInt(target.dataset.transactionId));
      }
    }
  });

  // 4. 绑定首页右上角的“+”按钮
  document.getElementById('add-product-btn').addEventListener('click', openAddProductChoiceModal);

  // 5. 绑定添加方式选择弹窗的按钮
  document.getElementById('add-product-manual-btn').addEventListener('click', () => {
    document.getElementById('add-product-choice-modal').classList.remove('visible');
    openProductEditor();
  });
  document.getElementById('add-product-link-btn').addEventListener('click', () => {
    document.getElementById('add-product-choice-modal').classList.remove('visible');
    openAddFromLinkModal();
  });
  document.getElementById('add-product-ai-btn').addEventListener('click', () => {
    document.getElementById('add-product-choice-modal').classList.remove('visible');
    handleGenerateProductsAI();
  });
  document.getElementById('cancel-add-choice-btn').addEventListener('click', () => {
    document.getElementById('add-product-choice-modal').classList.remove('visible');
  });

  // 6. 绑定手动添加/编辑弹窗的按钮
  document.getElementById('cancel-product-editor-btn').addEventListener('click', () => {
    document.getElementById('product-editor-modal').classList.remove('visible');
  });
  document.getElementById('save-product-btn').addEventListener('click', saveProduct);

  // 7. 绑定识别链接弹窗的按钮
  document.getElementById('cancel-link-paste-btn').addEventListener('click', () => {
    document.getElementById('add-from-link-modal').classList.remove('visible');
  });
  document.getElementById('confirm-link-paste-btn').addEventListener('click', handleAddFromLink);

  // ▼▼▼ 在 init() 的事件监听器区域，用这块【新代码】替换旧的 'products-view' 点击事件 ▼▼▼
  document.getElementById('products-view').addEventListener('click', async e => {
    const target = e.target;

    // 【核心修改】我们把原来的购买逻辑，改成了打开详情页的逻辑
    const productCard = target.closest('.product-card');
    if (productCard && !target.classList.contains('add-cart-btn')) {
      const productId = parseInt(productCard.dataset.productId);
      if (!isNaN(productId)) {
        await openProductDetail(productId); // <--- 就是修改了这里！
      }
      return;
    }

    // 下面这两部分逻辑保持不变
    if (target.classList.contains('add-cart-btn')) {
      const productId = parseInt(target.dataset.productId);
      if (!isNaN(productId)) {
        await handleAddToCart(productId);
      }
      return;
    }
    const categoryTab = target.closest('.category-tab-btn');
    if (categoryTab) {
      const category = categoryTab.dataset.category === 'all' ? null : categoryTab.dataset.category;
      renderTaobaoProducts(category);
      return;
    }
  });
  // ▲▲▲ 替换结束 ▲▲▲
  // ▼▼▼ 饿了么功能的核心事件监听器 ▼▼▼
  document.getElementById('eleme-view').addEventListener('click', async e => {
    // AI生成按钮
    if (e.target.closest('#eleme-generate-ai-btn')) {
      handleGenerateFoodsAI();
      return;
    }
    // 手动添加按钮
    if (e.target.closest('#eleme-add-manual-btn')) {
      openFoodEditor();
      return;
    }
    // 搜索按钮
    if (e.target.closest('#eleme-search-btn')) {
      handleSearchFoodsAI();
      return;
    }
    // ★★★ 核心修改：现在监听整个美食卡片的点击 ★★★
    const foodCard = e.target.closest('.product-card');
    if (foodCard) {
      const foodId = parseInt(foodCard.dataset.foodId);
      if (!isNaN(foodId)) {
        // 点击卡片后，调用我们新写的函数打开详情页
        await openFoodDetail(foodId);
      }
    }
  });
  // ▲▲▲ 饿了么事件监听结束 ▲▲▲
  // 绑定饿了么的“清空”按钮
  document.getElementById('eleme-clear-all-btn').addEventListener('click', clearElemeFoods);

  // ▼▼▼ 把这一整块全新的事件监听器代码，粘贴到 init() 的事件监听器区域末尾 ▼▼▼

  /* --- 【全新】“桃宝”App 搜索与AI结果弹窗事件监听器 --- */

  // 1. 绑定搜索按钮
  productSearchBtn.addEventListener('click', handleSearchProductsAI);
  productSearchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      handleSearchProductsAI();
    }
  });

  // 2. 绑定AI结果弹窗的关闭按钮
  document.getElementById('close-ai-products-modal-btn').addEventListener('click', async () => {
    aiGeneratedProductsModal.classList.remove('visible');
    // 关闭后刷新主页，显示新添加的商品
    await renderTaobaoProducts();
  });

  // taobao.js -> initTaobao() 函数内

  // 3. 使用事件委托，处理结果弹窗内所有“添加”按钮的点击
  document.getElementById('ai-product-results-grid').addEventListener('click', async e => {
    if (e.target.classList.contains('add-to-my-page-btn')) {
      const button = e.target;
      const productData = JSON.parse(button.dataset.product);

      // ★★★★★ 这就是我们这次唯一的、核心的修改！ ★★★★★
      // 1. 检查AI返回的商品数据里是否已经成功生成了图片URL
      if (!productData.imageUrl) {
        // 2. 如果【没有】图片URL（即生图失败了），
        //    我们就手动将它的imageUrl设置为空字符串''。
        productData.imageUrl = '';
        console.log(`AI生成的商品 "${productData.name}" 缺少图片，将添加到主页后继续尝试生成。`);
      }
      // 3. 如果已经有图片URL了，就什么也不做，直接使用现有的URL。
      //    我们不再需要那个补充默认图的 else 分支了。
      // ★★★★★ 修改结束 ★★★★★

      // 检查商品是否已存在（这部分逻辑不变）
      const existingProduct = await db.taobaoProducts.where('name').equals(productData.name).first();
      if (existingProduct) {
        alert('这个商品已经存在于你的桃宝主页啦！');
        button.textContent = '已添加';
        button.disabled = true;
        return;
      }

      // 添加到数据库（现在，生图失败的商品会以 imageUrl: '' 的形式被保存）
      await db.taobaoProducts.add(productData);

      // 禁用按钮并更新文本，给用户反馈
      button.textContent = '✓ 已添加';
      button.disabled = true;
    }
  });

  // ▼▼▼ 在 init() 的事件监听器区域末尾，粘贴下面这整块新代码 ▼▼▼

  /* --- 【全新】桃宝订单物流功能事件监听器 --- */

  // 1. 使用事件委托，为“我的订单”列表中的所有订单项绑定点击事件
  document.getElementById('orders-view').addEventListener('click', e => {
    const item = e.target.closest('.order-item');
    if (item && item.dataset.orderId) {
      const orderId = parseInt(item.dataset.orderId);
      if (!isNaN(orderId)) {
        openLogisticsView(orderId);
      }
    }
  });

  // 2. 绑定物流页面的返回按钮
  document.getElementById('logistics-back-btn').addEventListener('click', () => {
    // 返回时，直接显示“桃宝”主界面，并自动切换到“我的订单”页签
    showScreen('taobao-screen');
    switchTaobaoView('orders-view');
  });

  /* --- 事件监听结束 --- */

  // ▲▲▲ 新增代码粘贴结束 ▲▲▲
  document.getElementById('share-cart-to-char-btn').addEventListener('click', handleShareCartRequest);
  // ▼▼▼ 在 init() 的事件监听器区域粘贴 ▼▼▼
  document.getElementById('buy-for-char-btn').addEventListener('click', handleBuyForChar);
  // ▲▲▲ 粘贴结束 ▲▲▲
  /* --- “桃宝”App 事件监听器结束 --- */
}
