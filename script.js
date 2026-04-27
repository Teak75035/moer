// 等待DOM加载完成后执行所有逻辑
document.addEventListener('DOMContentLoaded', function () {
  // UUID
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Storage
  const STORAGE_KEY = 'oc_card_data_v2';
  function initStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        works: [],
        chars: []
      }));
    }
  }

  function getData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"works":[],"chars":[]}');
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Toast
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1800);
  }

  // 图片转Base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 选项卡切换
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.target;
      document.getElementById(target).classList.add('active');
      if (target === 'page-char') renderChars();
      if (target === 'page-work') renderWorks();
      if (target === 'page-birth') renderBirthday();
    });
  });

  // ================== 自定义日期选择器逻辑 ==================
  let currentDate = new Date(); // 当前显示的月份
  const birthDisplay = document.getElementById('char-birth-display');
  const birthInput = document.getElementById('char-birth');
  const datePanel = document.getElementById('date-picker-panel');
  const datePrevBtn = document.getElementById('date-prev-month');
  const dateNextBtn = document.getElementById('date-next-month');
  const dateMonthTitle = document.getElementById('date-current-month');
  const dateDaysContainer = document.getElementById('date-days');

  // 格式化日期为 YYYY-MM-DD
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 解析 YYYY-MM-DD 为 Date 对象
  function parseDate(str) {
    if (!str) return new Date();
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // 渲染日期面板
  function renderDatePanel() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 更新月份标题
    dateMonthTitle.textContent = `${year}年${month + 1}月`;

    // 清空日期格子
    dateDaysContainer.innerHTML = '';

    // 获取当月第一天是星期几
    const firstDay = new Date(year, month, 1).getDay();

    // 获取当月的天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 获取上月的天数
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // 渲染上月的最后几天
    for (let i = firstDay - 1; i >= 0; i--) {
      const dayEl = document.createElement('div');
      dayEl.className = 'date-picker-day other-month';
      dayEl.textContent = daysInPrevMonth - i;
      dateDaysContainer.appendChild(dayEl);
    }

    // 渲染当月的天数
    const selectedDate = parseDate(birthInput.value);
    for (let i = 1; i <= daysInMonth; i++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'date-picker-day';
      dayEl.textContent = i;

      // 标记选中的日期
      if (selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === i) {
        dayEl.classList.add('active');
      }

      // 点击选择日期
      dayEl.addEventListener('click', () => {
        const selected = new Date(year, month, i);
        birthInput.value = formatDate(selected);
        birthDisplay.value = formatDate(selected);
        renderDatePanel(); // 重新渲染以更新选中状态
        datePanel.classList.remove('show');
      });

      dateDaysContainer.appendChild(dayEl);
    }

    // 计算需要填充的下月天数
    const totalCells = firstDay + daysInMonth;
    const nextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    // 渲染下月的前几天
    for (let i = 1; i <= nextMonthDays; i++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'date-picker-day other-month';
      dayEl.textContent = i;
      dateDaysContainer.appendChild(dayEl);
    }
  }

  // 月份切换
  datePrevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderDatePanel();
  });

  dateNextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderDatePanel();
  });

  // 显示/隐藏日期面板
  birthDisplay.addEventListener('click', (e) => {
    e.stopPropagation();
    // 先设置当前显示的月份为选中日期的月份（如果有）
    if (birthInput.value) {
      currentDate = parseDate(birthInput.value);
    } else {
      currentDate = new Date();
    }
    renderDatePanel();
    datePanel.classList.toggle('show');
  });

  // 点击日期面板内部不关闭
  datePanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 点击页面其他地方关闭日期面板
  document.addEventListener('click', () => {
    datePanel.classList.remove('show');
  });

  // ================== 图片轮播/编辑逻辑 - 核心新增 ==================
  // 图片数据存储
  let charImages = []; // 角色图片数组
  let charDesignImages = []; // 设计图数组
  let currentCharImgIndex = 0; // 当前角色图片轮播索引
  let currentDesignImgIndex = 0; // 当前设计图轮播索引

  // 初始化图片轮播
  function initImageCarousel() {
    // 角色图片轮播控制
    document.getElementById('char-img-prev').addEventListener('click', (e) => {
      e.preventDefault();
      if (charImages.length === 0) return;
      currentCharImgIndex = (currentCharImgIndex - 1 + charImages.length) % charImages.length;
      updateCharImgCarousel();
    });

    document.getElementById('char-img-next').addEventListener('click', (e) => {
      e.preventDefault();
      if (charImages.length === 0) return;
      currentCharImgIndex = (currentCharImgIndex + 1) % charImages.length;
      updateCharImgCarousel();
    });

    // 设计图轮播控制
    document.getElementById('char-design-prev').addEventListener('click', (e) => {
      e.preventDefault();
      if (charDesignImages.length === 0) return;
      currentDesignImgIndex = (currentDesignImgIndex - 1 + charDesignImages.length) % charDesignImages.length;
      updateDesignImgCarousel();
    });

    document.getElementById('char-design-next').addEventListener('click', (e) => {
      e.preventDefault();
      if (charDesignImages.length === 0) return;
      currentDesignImgIndex = (currentDesignImgIndex + 1) % charDesignImages.length;
      updateDesignImgCarousel();
    });

    // 角色图片操作
    document.getElementById('char-img-up').addEventListener('click', (e) => {
      e.preventDefault();
      if (charImages.length <= 1 || currentCharImgIndex === 0) return;
      // 交换位置
      [charImages[currentCharImgIndex], charImages[currentCharImgIndex - 1]] =
        [charImages[currentCharImgIndex - 1], charImages[currentCharImgIndex]];
      currentCharImgIndex--;
      updateCharImgCarousel();
    });

    document.getElementById('char-img-down').addEventListener('click', (e) => {
      e.preventDefault();
      if (charImages.length <= 1 || currentCharImgIndex === charImages.length - 1) return;
      // 交换位置
      [charImages[currentCharImgIndex], charImages[currentCharImgIndex + 1]] =
        [charImages[currentCharImgIndex + 1], charImages[currentCharImgIndex]];
      currentCharImgIndex++;
      updateCharImgCarousel();
    });

    document.getElementById('char-img-delete').addEventListener('click', (e) => {
      e.preventDefault();
      if (charImages.length === 0) return;
      charImages.splice(currentCharImgIndex, 1);
      currentCharImgIndex = Math.min(currentCharImgIndex, charImages.length - 1);
      updateCharImgCarousel();
    });

    // 设计图操作
    document.getElementById('char-design-up').addEventListener('click', (e) => {
      e.preventDefault();
      if (charDesignImages.length <= 1 || currentDesignImgIndex === 0) return;
      // 交换位置
      [charDesignImages[currentDesignImgIndex], charDesignImages[currentDesignImgIndex - 1]] =
        [charDesignImages[currentDesignImgIndex - 1], charDesignImages[currentDesignImgIndex]];
      currentDesignImgIndex--;
      updateDesignImgCarousel();
    });

    document.getElementById('char-design-down').addEventListener('click', (e) => {
      e.preventDefault();
      if (charDesignImages.length <= 1 || currentDesignImgIndex === charDesignImages.length - 1) return;
      // 交换位置
      [charDesignImages[currentDesignImgIndex], charDesignImages[currentDesignImgIndex + 1]] =
        [charDesignImages[currentDesignImgIndex + 1], charDesignImages[currentDesignImgIndex]];
      currentDesignImgIndex++;
      updateDesignImgCarousel();
    });

    document.getElementById('char-design-delete').addEventListener('click', (e) => {
      e.preventDefault();
      if (charDesignImages.length === 0) return;
      charDesignImages.splice(currentDesignImgIndex, 1);
      currentDesignImgIndex = Math.min(currentDesignImgIndex, charDesignImages.length - 1);
      updateDesignImgCarousel();
    });

    // 图片放大预览
    document.getElementById('preview-close').addEventListener('click', () => {
      document.getElementById('image-preview-overlay').classList.remove('show');
    });

    // 监听图片上传
    document.getElementById('char-images').addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files.length) return;
      for (const file of files) {
        const base64 = await fileToBase64(file);
        charImages.push(base64);
      }
      currentCharImgIndex = charImages.length - 1;
      updateCharImgCarousel();
      // 清空input值，允许重复选择相同文件
      e.target.value = '';
    });

    document.getElementById('char-design-imgs').addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files.length) return;
      for (const file of files) {
        const base64 = await fileToBase64(file);
        charDesignImages.push(base64);
      }
      currentDesignImgIndex = charDesignImages.length - 1;
      updateDesignImgCarousel();
      // 清空input值，允许重复选择相同文件
      e.target.value = '';
    });
  }

  // 更新角色图片轮播
  function updateCharImgCarousel() {
    const container = document.getElementById('char-img-container');
    const indicators = document.getElementById('char-img-indicators');
    const countEl = document.getElementById('char-img-count');

    // 更新计数
    countEl.textContent = charImages.length;

    // 清空容器
    container.innerHTML = '';
    indicators.innerHTML = '';

    if (charImages.length === 0) {
      // 空状态
      container.innerHTML = '<div class="carousel-item"><div class="card-img-empty" style="height:100%;"><span class="material-icons">image</span></div></div>';
      return;
    }

    // 渲染轮播项
    charImages.forEach((imgSrc, index) => {
      const item = document.createElement('div');
      item.className = 'carousel-item';
      const img = document.createElement('img');
      img.src = imgSrc;
      img.className = 'carousel-img';
      // 点击放大预览
      img.addEventListener('click', () => {
        document.getElementById('preview-img').src = imgSrc;
        document.getElementById('image-preview-overlay').classList.add('show');
      });
      item.appendChild(img);
      container.appendChild(item);

      // 渲染指示器
      const indicator = document.createElement('div');
      indicator.className = `carousel-indicator ${index === currentCharImgIndex ? 'active' : ''}`;
      indicator.addEventListener('click', () => {
        currentCharImgIndex = index;
        updateCharImgCarousel();
      });
      indicators.appendChild(indicator);
    });

    // 设置轮播位置
    container.style.transform = `translateX(-${currentCharImgIndex * 100}%)`;
  }

  // 更新设计图轮播
  function updateDesignImgCarousel() {
    const container = document.getElementById('char-design-container');
    const indicators = document.getElementById('char-design-indicators');
    const countEl = document.getElementById('char-design-count');

    // 更新计数
    countEl.textContent = charDesignImages.length;

    // 清空容器
    container.innerHTML = '';
    indicators.innerHTML = '';

    if (charDesignImages.length === 0) {
      // 空状态
      container.innerHTML = '<div class="carousel-item"><div class="card-img-empty" style="height:100%;"><span class="material-icons">image</span></div></div>';
      return;
    }

    // 渲染轮播项
    charDesignImages.forEach((imgSrc, index) => {
      const item = document.createElement('div');
      item.className = 'carousel-item';
      const img = document.createElement('img');
      img.src = imgSrc;
      img.className = 'carousel-img';
      // 点击放大预览
      img.addEventListener('click', () => {
        document.getElementById('preview-img').src = imgSrc;
        document.getElementById('image-preview-overlay').classList.add('show');
      });
      item.appendChild(img);
      container.appendChild(item);

      // 渲染指示器
      const indicator = document.createElement('div');
      indicator.className = `carousel-indicator ${index === currentDesignImgIndex ? 'active' : ''}`;
      indicator.addEventListener('click', () => {
        currentDesignImgIndex = index;
        updateDesignImgCarousel();
      });
      indicators.appendChild(indicator);
    });

    // 设置轮播位置
    container.style.transform = `translateX(-${currentDesignImgIndex * 100}%)`;
  }

  // 重置图片数据
  function resetImageData() {
    charImages = [];
    charDesignImages = [];
    currentCharImgIndex = 0;
    currentDesignImgIndex = 0;
    updateCharImgCarousel();
    updateDesignImgCarousel();
  }

  // ================== 人物关系 ==================
  let relationIndex = 0;
  function addRelationUI(rel = {}) {
    const { chars } = getData();
    const id = relationIndex++;
    const item = document.createElement('div');
    item.className = 'relation-item';
    item.dataset.index = id;
    item.innerHTML = `
          <div class="relation-remove" onclick="removeRelation(${id})">×</div>
          <div class="relation-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <label class="form-label">关系类型</label>
              <select class="form-select rel-type" data-index="${id}">
                <option value="">请选择</option>
                <option value="同学">同学</option>
                <option value="朋友">朋友</option>
                <option value="闺蜜">闺蜜</option>
                <option value="兄弟">兄弟</option>
                <option value="亲人">亲人</option>
                <option value="恋人">恋人</option>
                <option value="师徒">师徒</option>
                <option value="敌人">敌人</option>
                <option value="自定义">自定义</option>
              </select>
            </div>
            <div>
              <label class="form-label">自定义关系</label>
              <input type="text" class="form-input rel-custom" data-index="${id}" placeholder="输入自定义关系">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">关联角色</label>
            <select class="form-select rel-target" data-index="${id}">
              <option value="">选择角色</option>
              ${chars.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">关系备注</label>
            <textarea class="form-textarea rel-note" data-index="${id}" placeholder="描述这段关系"></textarea>
          </div>
        `;
    document.getElementById('relation-list').appendChild(item);
    const typeSel = item.querySelector('.rel-type');
    const customInput = item.querySelector('.rel-custom');
    const targetSel = item.querySelector('.rel-target');

    // 修复：自定义关系编辑回显逻辑
    customInput.value = rel.custom || '';
    targetSel.value = rel.targetId || '';
    item.querySelector('.rel-note').value = rel.note || '';

    // 核心修复：如果 type 为空但 custom 有值，强制选中「自定义」
    if (!rel.type && rel.custom?.trim()) {
      typeSel.value = '自定义';
    } else {
      typeSel.value = rel.type || '';
    }

    // 初始化自定义输入框显示状态
    customInput.style.display = typeSel.value === '自定义' ? 'block' : 'none';

    typeSel.addEventListener('change', () => {
      customInput.style.display = typeSel.value === '自定义' ? 'block' : 'none';
    });
  }

  window.removeRelation = function (index) {
    document.querySelectorAll('.relation-item').forEach(el => {
      if (parseInt(el.dataset.index) === index) el.remove();
    });
  };

  document.getElementById('add-relation').addEventListener('click', () => {
    addRelationUI();
  });

  function collectRelations() {
    const list = [];
    document.querySelectorAll('.relation-item').forEach(item => {
      const type = item.querySelector('.rel-type').value;
      const custom = item.querySelector('.rel-custom').value.trim();
      const targetId = item.querySelector('.rel-target').value;
      const note = item.querySelector('.rel-note').value.trim();
      if (!targetId) return;
      list.push({
        type: type === '自定义' ? '' : type, // 保持数据格式：自定义时 type 为空
        custom: custom,
        targetId: targetId,
        note: note
      });
    });
    return list;
  }

  // ================== 人物相关 ==================
  let currentCharId = null;
  let deleteTarget = { type: '', id: '' };

  function renderChars() {
    const { chars, works } = getData();
    const list = document.getElementById('char-list');
    list.innerHTML = '';

    if (chars.length === 0) {
      list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8e8e93;">暂无人物数据，请点击"新增人物"添加</div>';
      return;
    }

    chars.forEach(c => {
      const work = works.find(w => w.id === c.workId) || { name: '未知作品' };
      const card = document.createElement('div');
      card.className = 'card';
      // 卡片点击绑定详情（排除菜单区域）
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-menu')) openCharDetail(c.id);
      });
      card.innerHTML = `
            ${c.images?.length ? `<img src="${c.images[0]}" class="card-img">`
          : '<div class="card-img-empty"><span class="material-icons">person</span></div>'}
            <div class="card-body">
              <div class="card-title">${c.name}</div>
              <div class="card-sub">${c.nick || '无昵称'} | ${work.name}</div>
              <div class="card-info">MBTI：${c.mbti || '未设置'} | 生日：${c.birth || '未设置'}</div>
            </div>
            <!-- 新增：右下角二级菜单 -->
            <div class="card-menu">
              <button class="menu-trigger" onclick="toggleMenu(event)">⋮</button>
              <div class="menu-panel">
                <div class="menu-item" onclick="event.stopPropagation(); openGraph('${c.workId}')">星图</div>
                <div class="menu-item" onclick="event.stopPropagation(); openCharEdit('${c.id}')">编辑</div>
                <div class="menu-item menu-item-danger" onclick="event.stopPropagation(); confirmDeleteChar('${c.id}', '${c.name}')">删除</div>
              </div>
            </div>
          `;
      list.appendChild(card);
    });
  }


  function fillWorkSelect() {
    const { works } = getData();
    const sel = document.getElementById('char-work');
    sel.innerHTML = '<option value="">请选择所属作品</option>';

    if (works.length === 0) {
      sel.innerHTML = '<option value="">暂无作品，请先添加作品</option>';
      sel.disabled = true;
      return;
    }

    sel.disabled = false;
    works.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      opt.textContent = w.name;
      sel.appendChild(opt);
    });
  }

  function openCharEdit(id = null) {
    currentCharId = id;
    const modal = document.getElementById('char-modal');
    const title = document.getElementById('char-modal-title');
    document.getElementById('char-form').reset();
    document.getElementById('relation-list').innerHTML = '';
    fillWorkSelect();

    // 重置图片数据和轮播
    resetImageData();

    // 重置日期选择器
    birthInput.value = '';
    birthDisplay.value = '';

    if (id) {
      title.textContent = '编辑人物';
      const { chars } = getData();
      const c = chars.find(x => x.id === id);
      if (!c) return;

      document.getElementById('char-name').value = c.name || '';
      document.getElementById('char-nick').value = c.nick || '';
      document.getElementById('char-mbti').value = c.mbti || '';

      // 设置日期选择器值
      birthInput.value = c.birth || '';
      birthDisplay.value = c.birth || '';

      document.getElementById('char-design').value = c.design || '';
      document.getElementById('char-personality').value = c.personality || '';
      document.getElementById('char-base').value = c.base || '';
      document.getElementById('char-work').value = c.workId || '';

      // 加载图片数据
      charImages = c.images || [];
      charDesignImages = c.designImages || [];
      updateCharImgCarousel();
      updateDesignImgCarousel();

      // 渲染人物关系
      (c.relations || []).forEach(r => addRelationUI(r));
    } else {
      title.textContent = '新增人物';
    }

    modal.classList.add('show');
  }

  // 绑定新增人物按钮
  document.getElementById('add-char').addEventListener('click', () => {
    openCharEdit();
  });

  // 保存人物
  document.getElementById('char-save').addEventListener('click', () => {
    const name = document.getElementById('char-name').value.trim();
    const workId = document.getElementById('char-work').value;
    const birth = document.getElementById('char-birth').value;

    // 验证必填项
    if (!name) {
      showToast('请输入角色名称');
      return;
    }
    if (!workId) {
      showToast('请选择所属作品');
      return;
    }
    if (!birth) {
      showToast('请选择生日');
      return;
    }

    const data = getData();
    const charData = {
      id: currentCharId || uuid(),
      name,
      nick: document.getElementById('char-nick').value.trim(),
      images: charImages,
      workId,
      design: document.getElementById('char-design').value.trim(),
      designImages: charDesignImages,
      personality: document.getElementById('char-personality').value.trim(),
      mbti: document.getElementById('char-mbti').value.trim(),
      birth,
      base: document.getElementById('char-base').value.trim(),
      relations: collectRelations()
    };

    if (currentCharId) {
      // 编辑
      const index = data.chars.findIndex(c => c.id === currentCharId);
      if (index !== -1) {
        data.chars[index] = charData;
      }
    } else {
      // 新增
      data.chars.push(charData);
    }

    saveData(data);
    document.getElementById('char-modal').classList.remove('show');
    showToast(currentCharId ? '人物编辑成功' : '人物添加成功');
    renderChars();
    renderBirthday();
  });

  // 关闭人物弹窗
  document.getElementById('char-close').addEventListener('click', () => {
    document.getElementById('char-modal').classList.remove('show');
  });
  document.getElementById('char-cancel').addEventListener('click', () => {
    document.getElementById('char-modal').classList.remove('show');
  });

  // ================== 作品相关 ==================
  function renderWorks() {
    const { works } = getData();
    const list = document.getElementById('work-list');
    list.innerHTML = '';

    if (works.length === 0) {
      list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8e8e93;">暂无作品数据，请点击"新增作品"添加</div>';
      return;
    }

    works.forEach(w => {
      const card = document.createElement('div');
      card.className = 'card';
      // 卡片点击绑定详情（排除菜单区域）
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.card-menu')) openWorkDetail(w.id);
      });
      card.innerHTML = `
            <div class="card-img-empty" style="height:120px;">
              <span class="material-icons" style="font-size:48px;">book</span>
            </div>
            <div class="card-body">
              <div class="card-title">${w.name}</div>
              <div class="card-info" style="margin-top:8px;">${w.desc || '暂无简介'}</div>
            </div>
            <!-- 新增：右下角二级菜单 -->
            <div class="card-menu">
              <button class="menu-trigger" onclick="toggleMenu(event)">⋮</button>
              <div class="menu-panel">
                <div class="menu-item" onclick="event.stopPropagation(); openWorkEdit('${w.id}')">编辑</div>
                <div class="menu-item menu-item-danger" onclick="event.stopPropagation(); confirmDeleteWork('${w.id}', '${w.name}')">删除</div>
              </div>
            </div>
          `;
      list.appendChild(card);
    });
  }

  let currentWorkId = null;

  function openWorkEdit(id = null) {
    currentWorkId = id;
    const modal = document.getElementById('work-modal');
    const title = document.getElementById('work-modal-title');
    document.getElementById('work-form').reset();

    if (id) {
      title.textContent = '编辑作品';
      const { works } = getData();
      const w = works.find(x => x.id === id);
      if (!w) return;

      document.getElementById('work-name').value = w.name || '';
      document.getElementById('work-desc').value = w.desc || '';
      document.getElementById('work-world').value = w.world || '';
    } else {
      title.textContent = '新增作品';
    }

    modal.classList.add('show');
  }

  // 绑定新增作品按钮
  document.getElementById('add-work').addEventListener('click', () => {
    openWorkEdit();
  });

  // 保存作品
  document.getElementById('work-save').addEventListener('click', () => {
    const name = document.getElementById('work-name').value.trim();
    const desc = document.getElementById('work-desc').value.trim();

    if (!name) {
      showToast('请输入作品名称');
      return;
    }
    if (!desc) {
      showToast('请输入作品简介');
      return;
    }

    const data = getData();
    const workData = {
      id: currentWorkId || uuid(),
      name,
      desc,
      world: document.getElementById('work-world').value.trim()
    };

    if (currentWorkId) {
      // 编辑
      const index = data.works.findIndex(w => w.id === currentWorkId);
      if (index !== -1) {
        data.works[index] = workData;
      }
    } else {
      // 新增
      data.works.push(workData);
    }

    saveData(data);
    document.getElementById('work-modal').classList.remove('show');
    showToast(currentWorkId ? '作品编辑成功' : '作品添加成功');
    renderWorks();
  });

  // 关闭作品弹窗
  document.getElementById('work-close').addEventListener('click', () => {
    document.getElementById('work-modal').classList.remove('show');
  });
  document.getElementById('work-cancel').addEventListener('click', () => {
    document.getElementById('work-modal').classList.remove('show');
  });

  // ================== 生日倒数 ==================
  function renderBirthday() {
    const { chars } = getData();
    const list = document.getElementById('birthday-list');
    list.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 过滤有生日的角色并计算倒数
    const birthdayChars = chars
      .filter(c => c.birth)
      .map(c => {
        const [year, month, day] = c.birth.split('-').map(Number);
        let nextBirthday = new Date(today.getFullYear(), month - 1, day);
        nextBirthday.setHours(0, 0, 0, 0);

        if (nextBirthday < today) {
          nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
        }

        const daysLeft = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
        return { ...c, daysLeft, nextBirthday };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    if (birthdayChars.length === 0) {
      list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8e8e93;">暂无设置生日的角色</div>';
      return;
    }

    birthdayChars.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card birthday-card';
      card.innerHTML = `
            <div class="birthday-day">${c.daysLeft}</div>
            <div class="birthday-info">
              <div class="card-title">${c.name}</div>
              <div class="card-sub">${c.nextBirthday.getMonth() + 1}月${c.nextBirthday.getDate()}日</div>
            </div>
          `;

      if (c.daysLeft === 0) {
        card.innerHTML = `
              <div class="birthday-day">🎂</div>
              <div class="birthday-info">
                <div class="card-title">${c.name}</div>
                <div class="card-sub" style="color:#5273f7;font-weight:600;">今天是TA的生日！</div>
              </div>
            `;
      }

      list.appendChild(card);
    });
  }

  // ================== 角色星图 ==================
function openGraph(workId) {
  const modal = document.getElementById('graph-modal');
  const canvas = document.getElementById('graph-canvas');
  const ctx = canvas.getContext('2d');

  modal.classList.add('show');
  
  // 等待模态框渲染完成再初始化画布尺寸
  setTimeout(() => {
    const displayWidth = canvas.offsetWidth || 800;
    const displayHeight = canvas.offsetHeight || 600;
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    init();
  }, 50);

  function init() {
    let nodes = [];
    let edgeGroups = new Map(); // 按节点对分组的有向边
    
    let isDragging = false;
    let dragNode = null;
    let prevX = 0;
    let prevY = 0;

    const { chars } = getData();
    const workChars = chars.filter(c => c.workId === workId);

    if (workChars.length < 2) {
      showToast('该作品至少需要2个角色才能生成星图');
      return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;

    // 常量定义（统一管理，所有参数可直接调整）
    const NODE_RADIUS = 35;
    const MIN_DIST = NODE_RADIUS * 6;  // 3个直径（最小距离）
    const MAX_DIST = NODE_RADIUS * 9;  // 4.5个直径（最大距离）
    const OPTIMAL_DIST = (MIN_DIST + MAX_DIST) / 2; // 理想平衡距离
    const LINE_OFFSET = 8; // 双向线的偏移量（避免重叠）
    const ARROW_SIZE = 8; // 箭头大小

    // 初始化节点
    nodes = workChars.map((c, i) => {
      const angle = (2 * Math.PI * i) / workChars.length;
      return {
        id: c.id,
        name: c.name,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: NODE_RADIUS
      };
    });

    // ================== 修复1：重构有向边分组逻辑，确保无遗漏 ==================
    const directedEdges = [];
    // 1. 收集所有有效有向边
    workChars.forEach(sourceChar => {
      (sourceChar.relations || []).forEach(rel => {
        const targetChar = workChars.find(c => c.id === rel.targetId);
        if (targetChar) {
          directedEdges.push({
            source: sourceChar.id,
            target: targetChar.id,
            type: rel.type || rel.custom || '关联'
          });
        }
      });
    });

    // 2. 按节点对分组（A-B和B-A强制分到同一组，避免分组错误）
    edgeGroups.clear();
    directedEdges.forEach(edge => {
      // 用Set排序，确保A-B和B-A的key完全一致
      const nodePair = [edge.source, edge.target];
      const groupKey = nodePair.sort().join('-');
      
      if (!edgeGroups.has(groupKey)) {
        edgeGroups.set(groupKey, []);
      }
      edgeGroups.get(groupKey).push(edge);
    });

    // ================== 修复2：重构物理引擎，弹簧力核心增强 ==================
    function applyPhysics() {
      const repulsionForce = 400; // 节点互斥力
      const damping = 0.92; // 阻尼降低，让弹簧运动更持久
      const wallBounce = 0.7; // 墙壁弹性系数
      const springStiffness = 0.08; // 弹簧刚度大幅提升，力更明显
      const maxSpringForce = 2; // 弹簧力上限，避免拉得太猛

      // 1. 节点互斥力（移出拖拽判断，拖拽时也生效，避免节点重叠）
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 1;
          
          // 距离小于100时触发互斥
          if (dist < 100) {
            const force = Math.min(repulsionForce / (dist * dist), maxSpringForce);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            // 拖拽中的节点也受轻微互斥，避免完全卡死
            if (a !== dragNode) { a.vx -= fx; a.vy -= fy; }
            if (b !== dragNode) { b.vx += fx; b.vy += fy; }
          }
        }
      }

      // 2. 核心修复：弹簧力（强制对每一组有连线的节点生效）
      edgeGroups.forEach((edgesInGroup, groupKey) => {
        const [idA, idB] = groupKey.split('-');
        const a = nodes.find(n => n.id === idA);
        const b = nodes.find(n => n.id === idB);
        if (!a || !b) return;

        // 计算节点距离
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        
        // 核心：非线性弹簧力（超出范围时力会指数级增强）
        let diff = 0;
        if (dist > MAX_DIST) {
          // 超过最大距离，拉力增强
          diff = (dist - OPTIMAL_DIST) * 1.5;
        } else if (dist < MIN_DIST) {
          // 小于最小距离，推力增强
          diff = (dist - OPTIMAL_DIST) * 1.5;
        } else {
          // 在范围内，轻微微调
          diff = (dist - OPTIMAL_DIST) * 0.5;
        }

        // 计算弹簧力，限制最大值避免失控
        const force = Math.min(diff * springStiffness, maxSpringForce);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        // 拖拽中的节点不受弹簧力，松开后立即生效
        if (a !== dragNode) {
          a.vx += fx;
          a.vy += fy;
        }
        if (b !== dragNode) {
          b.vx -= fx;
          b.vy -= fy;
        }
      });

      // 3. 更新位置 + 墙壁反弹
      nodes.forEach(n => {
        if (n === dragNode) return;
        
        // 应用速度更新位置
        n.x += n.vx;
        n.y += n.vy;
        // 应用阻尼衰减速度
        n.vx *= damping;
        n.vy *= damping;

        // 左墙反弹
        if (n.x - n.radius < 0) {
          n.x = n.radius;
          n.vx = -n.vx * wallBounce;
        }
        // 右墙反弹
        if (n.x + n.radius > canvas.width) {
          n.x = canvas.width - n.radius;
          n.vx = -n.vx * wallBounce;
        }
        // 上墙反弹
        if (n.y - n.radius < 0) {
          n.y = n.radius;
          n.vy = -n.vy * wallBounce;
        }
        // 下墙反弹
        if (n.y + n.radius > canvas.height) {
          n.y = canvas.height - n.radius;
          n.vy = -n.vy * wallBounce;
        }
      });
    }

    // ================== 箭头绘制工具函数（保留原有逻辑） ==================
    function drawArrowHead(x, y, angle, size) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x - size * Math.cos(angle - Math.PI / 6),
        y - size * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        x - size * Math.cos(angle + Math.PI / 6),
        y - size * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#d1d5db';
      ctx.fill();
    }

    // 绘制带箭头的线 + 正向文字
    function drawArrowLine(sourceId, targetId, text, offset, isBidirectional) {
      const s = nodes.find(n => n.id === sourceId);
      const t = nodes.find(n => n.id === targetId);
      if (!s || !t) return;

      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) return;

      // 垂直偏移向量（双线分离）
      const perpX = -dy / dist;
      const perpY = dx / dist;
      // 方向向量（线停在节点边缘）
      const dirX = dx / dist;
      const dirY = dy / dist;

      // 计算线的起点终点（避开节点）
      const nodeMargin = NODE_RADIUS + 3;
      const sX = s.x + perpX * offset + dirX * nodeMargin;
      const sY = s.y + perpY * offset + dirY * nodeMargin;
      const tX = t.x + perpX * offset - dirX * nodeMargin;
      const tY = t.y + perpY * offset - dirY * nodeMargin;

      // 连线角度
      const lineAngle = Math.atan2(tY - sY, tX - sX);

      // 1. 绘制连线
      ctx.beginPath();
      ctx.moveTo(sX, sY);
      ctx.lineTo(tX, tY);
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 2. 绘制箭头
      drawArrowHead(tX, tY, lineAngle, ARROW_SIZE);
      if (isBidirectional) {
        drawArrowHead(sX, sY, lineAngle + Math.PI, ARROW_SIZE);
      }

      // 3. 绘制正向文字（永不翻转）
      const midX = (sX + tX) / 2;
      const midY = (sY + tY) / 2;

      ctx.save();
      ctx.translate(midX, midY);

      // 核心：保证文字永远正向
      let displayAngle = lineAngle;
      if (displayAngle > Math.PI / 2 || displayAngle < -Math.PI / 2) {
        displayAngle = lineAngle + Math.PI;
      }
      ctx.rotate(displayAngle);

      // 文字背景
      ctx.font = '12px Noto Sans SC';
      const textWidth = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(-textWidth/2 - 4, -10, textWidth + 8, 18);

      // 绘制文字
      ctx.fillStyle = '#4b5563';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);

      ctx.restore();
    }

    // ================== 主绘制函数 ==================
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 先画线（底层）
      edgeGroups.forEach((edgesInGroup) => {
        if (edgesInGroup.length === 1) {
          // 单向关系：单根箭头线
          const edge = edgesInGroup[0];
          drawArrowLine(edge.source, edge.target, edge.type, 0, false);
        } else {
          // 双向关系
          const edge1 = edgesInGroup[0];
          const edge2 = edgesInGroup[1];
          const isMutual = (edge1.source === edge2.target && edge1.target === edge2.source);
          
          if (isMutual && edge1.type === edge2.type) {
            // 双向同文本：单根双向箭头线
            drawArrowLine(edge1.source, edge1.target, edge1.type, 0, true);
          } else {
            // 双向不同文本：两根分离的单向线
            drawArrowLine(edge1.source, edge1.target, edge1.type, LINE_OFFSET, false);
            drawArrowLine(edge2.source, edge2.target, edge2.type, LINE_OFFSET, false);
          }
        }
      });

      // 再画节点（顶层）
      nodes.forEach(n => {
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        
        // 节点圆形
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n === dragNode ? '#3b82f6' : '#5273f7';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';

        // 节点名称
        ctx.fillStyle = '#fff';
        ctx.font = '14px Noto Sans SC';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.name, n.x, n.y);
      });
    }

    // ================== 鼠标拖拽交互 ==================
    function getMousePos(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    canvas.addEventListener('mousedown', (e) => {
      const pos = getMousePos(e);
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dist = Math.hypot(pos.x - n.x, pos.y - n.y);
        if (dist < n.radius) {
          isDragging = true;
          dragNode = n;
          dragNode.vx = 0;
          dragNode.vy = 0;
          prevX = n.x;
          prevY = n.y;
          canvas.style.cursor = 'grabbing';
          break;
        }
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      const pos = getMousePos(e);
      if (isDragging && dragNode) {
        dragNode.x = pos.x;
        dragNode.y = pos.y;
        // 拖拽时限制在画布内
        dragNode.x = Math.max(dragNode.radius, Math.min(canvas.width - dragNode.radius, dragNode.x));
        dragNode.y = Math.max(dragNode.radius, Math.min(canvas.height - dragNode.radius, dragNode.y));
      } else {
        // 悬停手型
        let hovering = false;
        for (let n of nodes) {
          if (Math.hypot(pos.x - n.x, pos.y - n.y) < n.radius) {
            hovering = true; break;
          }
        }
        canvas.style.cursor = hovering ? 'grab' : 'default';
      }
    });

    canvas.addEventListener('mouseup', () => {
      if (isDragging && dragNode) {
        // 拖拽惯性系数1.0
        dragNode.vx = (dragNode.x - prevX) * 1.0;
        dragNode.vy = (dragNode.y - prevY) * 1.0;
      }
      isDragging = false;
      dragNode = null;
      canvas.style.cursor = 'default';
    });
    
    canvas.addEventListener('mouseleave', () => {
      isDragging = false;
      dragNode = null;
    });

    // ================== 动画循环 ==================
    function animate() {
      if (isDragging && dragNode) {
        prevX = dragNode.x;
        prevY = dragNode.y;
      }
      applyPhysics();
      draw();
      requestAnimationFrame(animate);
    }

    animate();
  }
}




  // 补充：关闭星图模态框的逻辑（如果没有的话）
  document.getElementById('graph-close')?.addEventListener('click', () => {
    document.getElementById('graph-modal').classList.remove('show');
  });


  // ================== 数据导入导出 ==================
  // 导出数据
  document.getElementById('export-data').addEventListener('click', () => {
    const data = getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oc_card_data_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据导出成功');
  });

  // 导入数据
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.works || !data.chars) {
          throw new Error('无效的数据格式');
        }
        saveData(data);
        showToast('数据导入成功');
        renderChars();
        renderWorks();
        renderBirthday();
      } catch (err) {
        showToast('导入失败：无效的JSON文件');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // ================== 确认删除弹窗 ==================
  document.getElementById('confirm-cancel').addEventListener('click', () => {
    document.getElementById('confirm-modal').classList.remove('show');
    deleteTarget = { type: '', id: '' };
  });

  document.getElementById('confirm-ok').addEventListener('click', () => {
    const data = getData();

    if (deleteTarget.type === 'char') {
      // 删除角色
      data.chars = data.chars.filter(c => c.id !== deleteTarget.id);
      // 同时删除其他角色中与该角色的关系
      data.chars.forEach(c => {
        c.relations = (c.relations || []).filter(r => r.targetId !== deleteTarget.id);
      });
      showToast('角色删除成功');
    } else if (deleteTarget.type === 'work') {
      // 删除作品及关联角色
      data.works = data.works.filter(w => w.id !== deleteTarget.id);
      data.chars = data.chars.filter(c => c.workId !== deleteTarget.id);
      showToast('作品及关联角色删除成功');
    }

    saveData(data);
    document.getElementById('confirm-modal').classList.remove('show');
    renderChars();
    renderWorks();
    renderBirthday();
    deleteTarget = { type: '', id: '' };
  });

  // 新增：切换二级菜单
  function toggleMenu(e) {
    e.stopPropagation();
    // 找到真正的 menu-trigger 按钮
    const trigger = e.target.closest('.menu-trigger');
    if (!trigger) return;

    // 获取菜单面板
    const panel = trigger.nextElementSibling;
    if (!panel || !panel.classList.contains('menu-panel')) return;

    // 关闭其他菜单
    document.querySelectorAll('.menu-panel.show').forEach(p => {
      if (p !== panel) p.classList.remove('show');
    });

    // 切换当前菜单
    panel.classList.toggle('show');

    // 点击菜单项时阻止冒泡
    panel.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (ev) => ev.stopPropagation());
    });

    // 点击其他地方关闭菜单
    const closeMenu = (ev) => {
      // 如果点击的不是当前菜单和触发按钮，则关闭菜单
      if (!panel.contains(ev.target) && !trigger.contains(ev.target)) {
        panel.classList.remove('show');
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }

  // 新增：确认删除角色/作品
  function confirmDeleteChar(id, name) {
    deleteTarget = { type: 'char', id };
    document.getElementById('confirm-title').textContent = `确定要删除「${name}」吗？`;
    document.getElementById('confirm-modal').classList.add('show');
  }
  function confirmDeleteWork(id, name) {
    deleteTarget = { type: 'work', id };
    document.getElementById('confirm-title').textContent = `确定要删除「${name}」吗？删除后所有关联角色也会被删除`;
    document.getElementById('confirm-modal').classList.add('show');
  }

  // XSS 防護工具函數
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return map[m];
    });
  }

  // 優化後的 openCharDetail
  function openCharDetail(id) {
    const { chars, works } = getData();
    const c = chars.find(x => x.id === id);
    if (!c) { console.warn('未找到角色:', id); return; }
    const work = works.find(w => w.id === c.workId) || { name: '未知作品' };

    // 獲取現有 DOM 元素
    const modal = document.getElementById('detail-modal');
    const titleEl = document.getElementById('detail-title');
    const closeBtn = document.getElementById('detail-close');
    const bodyEl = document.getElementById('detail-body');

    // 1. 設定標題文字
    titleEl.textContent = c.name;

    // 2. 動態生成 Banner HTML (如果有設計圖)
    const hasBanner = c.designImages?.length > 0;
    const bannerHtml = hasBanner ? `
          <div class="detail-banner">
            <div class="banner-scroll">
              ${c.designImages.map(img => `
                <img src="${escapeHtml(img)}" class="banner-img" loading="lazy" onerror="this.style.display='none'">
              `).join('')}
            </div>
            <div class="banner-mask"></div>
          </div>
        ` : '';

    // 3. 動態改變 Header 樣式 (如果有 Banner，變成白色文字/半透明背景)
    if (hasBanner) {
      titleEl.style.color = '#fff';
      titleEl.style.textShadow = '0 2px 8px rgba(0,0,0,0.3)';
      closeBtn.style.cssText = 'background: rgba(255,255,255,0.2); color: #fff;';
    } else {
      // 恢復預設樣式
      titleEl.style.color = '#303133';
      titleEl.style.textShadow = 'none';
      closeBtn.style.cssText = '';
    }

    // 4. 生成核心內容 HTML
    const coreInfoHtml = `
          <div class="core-info-grid">
            <div class="info-card"><div class="info-label">昵称</div><div class="info-value">${escapeHtml(c.nick || '未设置')}</div></div>
            <div class="info-card"><div class="info-label">所属作品</div><div class="info-value">${escapeHtml(work.name)}</div></div>
            <div class="info-card"><div class="info-label">MBTI</div><div class="info-value">${escapeHtml(c.mbti || '未设置')}</div></div>
            <div class="info-card"><div class="info-label">生日</div><div class="info-value">${escapeHtml(c.birth || '未设置')}</div></div>
          </div>
        `;

    const descHtml = `
          <div class="detail-section">
            <div class="section-label">设计描述</div>
            <div class="section-content">${escapeHtml(c.design || '无')}</div>
          </div>
          <div class="detail-section">
            <div class="section-label">性格特点</div>
            <div class="section-content">${escapeHtml(c.personality || '无')}</div>
          </div>
          <div class="detail-section">
            <div class="section-label">基础设定</div>
            <div class="section-content">${escapeHtml(c.base || '无')}</div>
          </div>
        `;

    const charImageHtml = c.images?.length ? `
          <div class="detail-section">
            <div class="section-label">角色图</div>
            <div class="detail-gallery">
              ${c.images.map(img => `<img src="${escapeHtml(img)}" class="gallery-img" loading="lazy" onerror="this.style.display='none'">`).join('')}
            </div>
          </div>
        ` : '';

    const relationHtml = (c.relations || []).length ? `
          <div class="detail-section">
            <div class="section-label">人物关系</div>
            <div class="relation-wrap">
              ${c.relations.map(r => {
      const target = chars.find(t => t.id === r.targetId);
      const note = r.note ? `（${escapeHtml(r.note)}）` : '';
      return `<span class="relation-tag">${escapeHtml(target?.name || '未知')} · ${escapeHtml(r.type || r.custom || '自定義')}${note}</span>`;
    }).join('')}
            </div>
          </div>
        ` : '';

    // 5. 組裝並寫入 modal-body
    // 判斷如果沒有 Banner，給內容區加一個上 Padding，避開 Header
    const contentPaddingTop = hasBanner ? '' : 'padding-top: 60px;';

    bodyEl.innerHTML = `
          ${bannerHtml}
          <div class="detail-content-inner" style="${contentPaddingTop}">
            ${coreInfoHtml}
            ${descHtml}
            ${charImageHtml}
            ${relationHtml}
          </div>
        `;

    // 6. 顯示彈窗
    modal.classList.add('show');
  }

  // --- 記得綁定關閉按鈕的事件 (如果原本沒有的話) ---
  document.getElementById('detail-close').addEventListener('click', () => {
    document.getElementById('detail-modal').classList.remove('show');
  });
  // 點擊背景也可以關閉 (選擇性添加)
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') {
      document.getElementById('detail-modal').classList.remove('show');
    }
  });

  // 新增：打开作品详情
  function openWorkDetail(id) {
    const { works, chars } = getData();
    const w = works.find(x => x.id === id);
    const relatedChars = chars.filter(c => c.workId === id);
    document.getElementById('detail-title').textContent = w.name;
    document.getElementById('detail-body').innerHTML = `
          <div class="detail-grid">
            <div class="detail-item-full"><div class="detail-label">作品简介</div><div class="detail-value">${w.desc || '无'}</div></div>
            <div class="detail-item-full"><div class="detail-label">世界观设定</div><div class="detail-value">${w.world || '无'}</div></div>
            ${relatedChars.length ? `<div class="detail-item-full"><div class="detail-label">关联角色</div><div class="detail-chars">${relatedChars.map(c => `<span class="char-tag">${c.images?.length ? `<img src="${c.images[0]}" class="char-tag-img">` : ''}${c.name}</span>`).join('')}</div></div>` : ''}
          </div>
        `;
    document.getElementById('detail-modal').classList.add('show');
  }

  // 绑定详情弹窗关闭
  document.getElementById('detail-close').addEventListener('click', () => {
    document.getElementById('detail-modal').classList.remove('show');
  });


  // ================== 初始化 ==================
  // 優化後的 openCharDetail
  function openCharDetail(id) {
    const { chars, works } = getData();
    const c = chars.find(x => x.id === id);
    if (!c) { console.warn('未找到角色:', id); return; }
    const work = works.find(w => w.id === c.workId) || { name: '未知作品' };
    // 獲取現有 DOM 元素
    const modal = document.getElementById('detail-modal');
    const titleEl = document.getElementById('detail-title');
    const closeBtn = document.getElementById('detail-close');
    const bodyEl = document.getElementById('detail-body');
    // 1. 設定標題文字
    titleEl.textContent = c.name;
    // 2. 動態生成 Banner HTML (如果有設計圖)
    const hasBanner = c.designImages?.length > 0;
    const bannerHtml = hasBanner ? `
          <div class="detail-banner">
            <div class="banner-scroll">
              ${c.designImages.map(img => `
                <img src="${escapeHtml(img)}" class="banner-img" loading="lazy" onerror="this.style.display='none'">
              `).join('')}
            </div>
            <div class="banner-mask"></div>
          </div>
        ` : '';
    // 3. 動態改變 Header 樣式 (如果有 Banner，變成白色文字/半透明背景)
    if (hasBanner) {
      titleEl.style.color = '#fff';
      titleEl.style.textShadow = '0 2px 8px rgba(0,0,0,0.3)';
      closeBtn.style.cssText = 'background: rgba(255,255,255,0.2); color: #fff;';
    } else {
      // 恢復預設樣式
      titleEl.style.color = '#303133';
      titleEl.style.textShadow = 'none';
      closeBtn.style.cssText = '';
    }
    // 4. 生成核心內容 HTML
    const coreInfoHtml = `
          <div class="core-info-grid">
            <div class="info-card"><div class="info-label">昵称</div><div class="info-value">${escapeHtml(c.nick || '未设置')}</div></div>
            <div class="info-card"><div class="info-label">所属作品</div><div class="info-value">${escapeHtml(work.name)}</div></div>
            <div class="info-card"><div class="info-label">MBTI</div><div class="info-value">${escapeHtml(c.mbti || '未设置')}</div></div>
            <div class="info-card"><div class="info-label">生日</div><div class="info-value">${escapeHtml(c.birth || '未设置')}</div></div>
          </div>
        `;
    const descHtml = `
          <div class="detail-section">
            <div class="section-label">设计描述</div>
            <div class="section-content">${escapeHtml(c.design || '无')}</div>
          </div>
          <div class="detail-section">
            <div class="section-label">性格特点</div>
            <div class="section-content">${escapeHtml(c.personality || '无')}</div>
          </div>
          <div class="detail-section">
            <div class="section-label">基础设定</div>
            <div class="section-content">${escapeHtml(c.base || '无')}</div>
          </div>
        `;

    // ================== 核心修改：完整展示所有图片 ==================
    // 合并角色图和设计图（可选，也可分开展示）
    const allImages = [
      ...(c.images || []),
      ...(c.designImages || [])
    ];

    const charImageHtml = allImages.length ? `
          <div class="detail-section">
            <div class="section-label">全部图片 (${allImages.length})</div>
            <div class="detail-gallery">
              ${allImages.map(img => `
                <div class="gallery-item">
                  <img src="${escapeHtml(img)}" class="gallery-img" loading="lazy" onerror="this.style.display='none'">
                </div>
              `).join('')}
            </div>
          </div>
        ` : '';
    // ====================================================================

    const relationHtml = (c.relations || []).length ? `
          <div class="detail-section">
            <div class="section-label">人物关系</div>
            <div class="relation-wrap">
              ${c.relations.map(r => {
      const target = chars.find(t => t.id === r.targetId);
      const note = r.note ? `（${escapeHtml(r.note)}）` : '';
      return `<span class="relation-tag">${escapeHtml(target?.name || '未知')} · ${escapeHtml(r.type || r.custom || '自定義')}${note}</span>`;
    }).join('')}
            </div>
          </div>
        ` : '';
    // 5. 組裝並寫入 modal-body
    // 判斷如果沒有 Banner，給內容區加一個上 Padding，避開 Header
    const contentPaddingTop = hasBanner ? '' : 'padding-top: 60px;';
    bodyEl.innerHTML = `
          ${bannerHtml}
          <div class="detail-content-inner" style="${contentPaddingTop}">
            ${coreInfoHtml}
            ${descHtml}
            ${charImageHtml}
            ${relationHtml}
          </div>
        `;

    // ================== 核心新增：给详情页内图片绑定点击预览事件 ==================
    const previewImg = document.getElementById('preview-img');
    const previewOverlay = document.getElementById('image-preview-overlay');

    // 给 Banner 图片添加点击事件
    bodyEl.querySelectorAll('.banner-img').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止冒泡，避免误触详情页关闭
        previewImg.src = img.src;
        previewOverlay.classList.add('show');
      });
    });

    // 给图库图片添加点击事件
    bodyEl.querySelectorAll('.gallery-img').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        previewImg.src = img.src;
        previewOverlay.classList.add('show');
      });
    });
    // ================================================================================

    // 6. 顯示彈窗
    modal.classList.add('show');
  }

  // --- 記得綁定關閉按鈕的事件 (如果原本沒有的話) ---
  document.getElementById('detail-close').addEventListener('click', () => {
    document.getElementById('detail-modal').classList.remove('show');
  });
  // 點擊背景也可以關閉 (選擇性添加)
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') {
      document.getElementById('detail-modal').classList.remove('show');
    }
  });

  // 新增：打开作品详情
  function openWorkDetail(id) {
    const { works, chars } = getData();
    const w = works.find(x => x.id === id);
    const relatedChars = chars.filter(c => c.workId === id);
    document.getElementById('detail-title').textContent = w.name;
    document.getElementById('detail-body').innerHTML = `
          <div class="detail-grid">
            <div class="detail-item-full"><div class="detail-label">作品简介</div><div class="detail-value">${w.desc || '无'}</div></div>
            <div class="detail-item-full"><div class="detail-label">世界观设定</div><div class="detail-value">${w.world || '无'}</div></div>
            ${relatedChars.length ? `<div class="detail-item-full"><div class="detail-label">关联角色</div><div class="detail-chars">${relatedChars.map(c => `<span class="char-tag">${c.images?.length ? `<img src="${c.images[0]}" class="char-tag-img">` : ''}${c.name}</span>`).join('')}</div></div>` : ''}
          </div>
        `;
    document.getElementById('detail-modal').classList.add('show');
  }

  // 绑定详情弹窗关闭
  document.getElementById('detail-close').addEventListener('click', () => {
    document.getElementById('detail-modal').classList.remove('show');
  });


  // ================== 初始化 ==================
  initStorage();
  initImageCarousel();
  renderChars();
  renderWorks();
  renderBirthday();
  // 默认渲染第一个标签页
  document.querySelector('.tab-item').click();

  // 修复：暴露所有需要全局访问的函数
  window.openCharEdit = openCharEdit;
  window.openGraph = openGraph;
  window.confirmDeleteChar = confirmDeleteChar;
  window.confirmDeleteWork = confirmDeleteWork;
  window.openWorkEdit = openWorkEdit;
  window.toggleMenu = toggleMenu;
});
