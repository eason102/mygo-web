document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('keyword');
  const searchButton = document.getElementById('search-btn');
  const resultsContainer = document.getElementById('results-container');
  const imageViewerModal = document.getElementById('image-viewer-modal');
  const closeViewerButton = document.getElementById('close-viewer');
  const viewerMainImage = document.getElementById('viewer-main-image');
  const previewFramesContainer = document.getElementById('preview-frames');
  const viewerCopyButton = document.getElementById('viewer-copy-button'); // 複製按鈕
  const viewerDownloadButton = document.getElementById('viewer-download-button'); // 下載按鈕
  const notificationContainer = document.getElementById('notification-container'); // 通知容器
  const switchLabelButton = document.getElementById('switch-label-button'); // 切換標籤視圖按鈕
  const loadPreviewFramesButton = document.getElementById('load-preview-frames-button'); // 新增的預覽幀加載按鈕
  const viewerGifButton = document.getElementById('viewer-gif-button'); // 新增的 GIF 按鈕
  
  // 新的「更多篩選」按鈕和容器
  const toggleMoreFiltersBtn = document.getElementById('toggle-more-filters-btn');
  const moreFilterOptions = document.getElementById('more-filter-options');
  
  // 新增角色資訊切換按鈕
  const toggleCharacterInfoBtn = document.getElementById('toggle-character-info-btn');
  let isCharacterInfoVisible = false; // 新增狀態變數
  
  searchButton.addEventListener('click', performSearch);
  
  searchInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
          performSearch();
      }
  });
  
  closeViewerButton.addEventListener('click', closeImageViewer); // 關閉檢視器事件監聽
  viewerCopyButton.addEventListener('click', copyViewerImage); // 複製按鈕事件監聽
  viewerDownloadButton.addEventListener('click', downloadViewerImage); // 下載按鈕事件監聽
  switchLabelButton.addEventListener('click', toggleLabelView); // 切換標籤視圖按鈕事件監聽
  loadPreviewFramesButton.addEventListener('click', loadPreviewFrames); // 新增的預覽幀加載按鈕事件監聽
  viewerGifButton.addEventListener('click', toggleGifMode); // 新增的 GIF 按鈕事件監聽
  
  toggleMoreFiltersBtn.addEventListener('click', function() {
      if (moreFilterOptions.style.display === 'none') {
          moreFilterOptions.style.display = 'block';
          toggleMoreFiltersBtn.style.display = 'none'; // 點擊後隱藏按鈕
      } else {
          moreFilterOptions.style.display = 'none';
      }
  });
  
  toggleCharacterInfoBtn.addEventListener('click', toggleCharacterInfo); // 新增事件監聽
  
  let currentAbortController = null; // 追蹤當前的 AbortController
  let originalMainImageSrc = ""; // 儲存原始主圖片的 src
  let currentImageType = ""; // 儲存當前圖片類型 (ocr 或 scene)
  let currentEpisode = ""; // 儲存當前集數
  let currentFrameStart = ""; // 儲存當前起始幀
  let currentSceneNumber = ""; // 儲存當前場景編號
  let previewFramesLoaded = false; // 追蹤預覽幀是否已加載
  let gifMode = false; // 是否處於 GIF 製作模式
  let startFrame = 0;
  let endFrame = 0;
  
  // 新增滑桿事件監聽
  const startSlider = document.getElementById('start-frame-slider');
  const endSlider = document.getElementById('end-frame-slider');
  const startInput = document.getElementById('start-frame-input');
  const endInput = document.getElementById('end-frame-input');
  
  // 添加空值检查
  if (startSlider && endSlider) {
      [startSlider, endSlider].forEach((slider, index) => {
          const tooltip = document.createElement('div');
          tooltip.className = 'slider-tooltip';
          // 添加 parentNode 存在性检查
          if (slider.parentNode) {
              slider.parentNode.insertBefore(tooltip, slider.nextSibling);
          }
          slider.addEventListener('input', function() {
              const delta = parseInt(this.value);
              const frameType = index === 0 ? 'start' : 'end';
              tooltip.textContent = `${delta > 0 ? '+' : ''}${delta}幀`;
              tooltip.style.left = `${(this.value - this.min) / (this.max - this.min) * 100}%`;
              tooltip.style.display = 'block';
          });

          slider.addEventListener('change', function() {
              const delta = parseInt(this.value);
              const frameType = index === 0 ? 'start' : 'end';
              adjustFrameByDelta(frameType, delta);
              this.value = 0; // 重置滑杆位置
              tooltip.style.display = 'none';
          });
      });
  }
  
  // 修改快捷按钮事件監聽
  document.querySelectorAll('.jump-btn').forEach(button => {
      button.addEventListener('click', function() {
          const delta = parseInt(this.dataset.delta);
          const frameType = this.dataset.type;
          adjustFrameByDelta(frameType, delta);
      });
  });
  
  function closeImageViewer() {
      imageViewerModal.style.display = "none";
      previewFramesContainer.innerHTML = ''; // 清空預覽圖容器
      originalMainImageSrc = ""; // 清空原始圖片 src
      currentImageType = ""; // 清空圖片類型
      currentEpisode = ""; // 清空集數
      currentFrameStart = ""; // 清空起始幀
      currentSceneNumber = ""; // 清空場景編號
      previewFramesLoaded = false; // 重置預覽幀加載狀態
      loadPreviewFramesButton.style.display = 'block'; // 顯示加載按鈕
      
      // 新增清空 GIF 制作器内容
      const gifContainer = document.getElementById('gif-maker-container');
      gifContainer.style.display = 'none';
      document.getElementById('gif-start-frame').innerHTML = '';
      document.getElementById('gif-end-frame').innerHTML = '';
      document.getElementById('gif-result').innerHTML = '';
  }
  
  function copyViewerImage() { // 複製檢視器圖片
      copyImage(viewerMainImage.src); // 使用主預覽圖片的 src
  }
  
  function downloadViewerImage() { // 下載檢視器圖片
      downloadImage(viewerMainImage.src); // 使用主預覽圖片的 src
  }
  
  function downloadImage(imageUrl) {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = 'ave_mujica_frame.png'; // 你可以自訂下載的檔名
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  }
  
  async function performSearch() {
      const startTime = Date.now(); // 记录开始时间
      if (currentAbortController) {
          currentAbortController.abort(); // 取消之前的請求
      }
      currentAbortController = new AbortController(); // 建立新的 AbortController
  
      const keyword = searchInput.value.trim();
      const checkedSearchType = document.querySelector('input[name="search-type"]:checked');
      const searchType = checkedSearchType ? checkedSearchType.value : 'both';
      const characterFilter = Array.from(document.querySelectorAll('.character-filter-options input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
      
      // 獲取選取的動畫集數
      const episodeFilter = Array.from(document.querySelectorAll('.episode-filter-options input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
  
      if (!keyword) {
          showNotification("請輸入關鍵字");
          return;
      }
  
      // 在這裡添加重置操作
      resultsContainer.innerHTML = ''; // 清空搜尋結果
      resultsContainer.textContent = '搜尋中...'; // 顯示搜尋中訊息
      displayCharacterInfo([]); // 清空角色信息
      hideNotification(); // 隱藏通知
  
      let apiUrl = `https://mygo-api.tomorin.cc/api/ave-search?keyword=${encodeURIComponent(keyword)}&search_type=${searchType}`;
      
      // 檢查是否所有角色篩選都被選中
      const allCharacterCheckboxes = document.querySelectorAll('.character-filter-options input[type="checkbox"]');
      const allCharactersChecked = Array.from(allCharacterCheckboxes).every(checkbox => checkbox.checked);
  
      if (!allCharactersChecked && characterFilter.length > 0) {
          apiUrl += `&characters=${encodeURIComponent(characterFilter.join(','))}`;
      }
  
      // 檢查是否所有動畫集數篩選都被選中
      const allEpisodeCheckboxes = document.querySelectorAll('.episode-filter-options input[type="checkbox"]');
      const allEpisodesChecked = Array.from(allEpisodeCheckboxes).every(checkbox => checkbox.checked);
  
      if (!allEpisodesChecked && episodeFilter.length > 0) {
          apiUrl += `&episode=${encodeURIComponent(episodeFilter.join(','))}`;
      }
  
      try {
          const response = await fetch(apiUrl, { signal: currentAbortController.signal }); // 使用 AbortController 的 signal
          const data = await response.json();
          resultsContainer.innerHTML = ''; // 清空搜尋中訊息
          if (data && data.data && data.data.length > 0) {
              // 假設所有結果的角色信息相同，僅以第一個結果為例
              if (data.data[0].characters) {
                  displayCharacterInfo(data.data[0].characters);
              }
              let totalResults = data.data.length; // 總結果數量
              let completedResults = 0; // 已完成的結果數量
  
              for (const result of data.data) {
                  await fetchImage(result);
                  completedResults++; // 每次成功獲取圖片後增加計數
                  showProgress(completedResults, totalResults, startTime); // 顯示進度
              }
  
              // 加載完成後顯示總耗時
              if (completedResults === totalResults) {
                  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1); // 计算总耗时（秒）
                  const completionMessage = `加載完成 共耗時${totalTime}秒`;
                  const progressElement = document.getElementById('progress-container');
                  progressElement.textContent = completionMessage; // 更新進度信息
              }
          } else {
              resultsContainer.innerHTML = '<p>沒有搜尋到相關結果。</p>';
              // 清空角色信息
              displayCharacterInfo([]);
          }
      } catch (error) {
          if (error.name === 'AbortError') {
              console.log('請求已取消');
              return; // 如果請求被取消，則不顯示錯誤訊息
          }
          resultsContainer.innerHTML = '<p>搜尋時發生錯誤，請稍後再試。</p>';
          console.error("搜尋錯誤:", error);
          // 清空角色信息
          displayCharacterInfo([]);
      }
  }
  
  async function fetchImage(result) {
    const frameApiUrl = 'https://mygo-api.tomorin.cc/api/ave-frames';
    try {
        const response = await fetch(frameApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                episode: result.episode,
                frame_start: result.frame_start,
                frame_end: result.frame_end
            }),
            signal: currentAbortController.signal 
        });
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        displayResult(result, imageUrl, null, result.episode, result.text, result.frame_start, result.frame_end, result.type, result.scene_number); // 傳遞 type 和 scene_number
    } catch (error) {
        if (error.name === 'AbortError') {
            return; // 如果請求被取消，則不執行
        }
        console.error("圖片請求錯誤:", error);
        displayResult(result, null, "圖片載入失敗", result.episode, result.text, result.frame_start, result.frame_end, result.type, result.scene_number); // 傳遞 type 和 scene_number
    }
  }
  
  function displayResult(result, imageUrl, errorMsg, episode, text, frameStart, frameEnd, type, sceneNumber) { // 接收 type 和 sceneNumber
    const resultItem = document.createElement('div');
    resultItem.classList.add('result-item');
    
    if (imageUrl) {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = "台詞截圖";
        img.id = "result-image";
        resultItem.appendChild(img);
    }
    

    // 創建文字覆蓋層
    const textOverlay = document.createElement('div');
    textOverlay.classList.add('text-overlay');
    textOverlay.innerText = errorMsg ? errorMsg : `${episode} - ${text || "場景"}`;
    resultItem.appendChild(textOverlay);

    // 添加複製按鈕
    const copyButton = document.createElement('button');
    copyButton.classList.add('copy-button');
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.addEventListener('click', (event) => {
        event.stopPropagation();
        copyImage(imageUrl);
    });
    resultItem.appendChild(copyButton);

    resultsContainer.appendChild(resultItem);

    // 圖片點擊事件監聽器
    resultItem.addEventListener('click', function () {
        if (imageUrl) {
            openImageViewer(imageUrl, result.episode, result.frame_start, result.frame_end, result.text, result.characters, type, sceneNumber); // 傳遞 type 和 sceneNumber
        }
    });
}

  async function openImageViewer(mainImageUrl, episode, frameStart, frameEnd, text, characters, type, sceneNumber) { // 接收 type 和 sceneNumber
    imageViewerModal.style.display = "block"; // 顯示檢視器
    viewerMainImage.src = mainImageUrl; // 設定主預覽圖片
    originalMainImageSrc = mainImageUrl; // 儲存原始圖片 src
    currentImageType = type; // 儲存圖片類型
    currentEpisode = episode; // 儲存集數
    currentFrameStart = frameStart; // 儲存起始幀
    currentSceneNumber = sceneNumber; // 儲存場景編號
    previewFramesLoaded = false; // 重置預覽幀加載狀態
    loadPreviewFramesButton.style.display = 'block'; // 顯示加載按鈕
    currentFrameEnd = frameEnd; // 新增當前結束幀儲存

    // 顯示角色信息
    displayCharacterInfo(characters);
    document.getElementById('character-info').style.display = 'none'; // 預設隱藏
    isCharacterInfoVisible = false; // 重置狀態
    toggleCharacterInfoBtn.querySelector('.text').textContent = '角色資訊'; // 重置按鈕文字
  }

  // 切換標籤視圖
  async function toggleLabelView() {
    if (!originalMainImageSrc) return; // 如果沒有原始圖片，則不執行

    let apiUrl = "";
    let currentImage = viewerMainImage.src;

    if (currentImageType === "ocr") {
        apiUrl = `https://mygo-api.tomorin.cc/api/label_visualization?type=ocr&episode=${currentEpisode}&frame_start=${currentFrameStart}`;
    } else if (currentImageType === "scene") {
        apiUrl = `https://mygo-api.tomorin.cc/api/label_visualization?type=scene&episode=${currentEpisode}&scene_number=${currentSceneNumber}`;
    } else {
        return; // 如果沒有圖片類型，則不執行
    }

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data && data.url) {
            viewerMainImage.src = viewerMainImage.src === originalMainImageSrc ? data.url : originalMainImageSrc; // 切換圖片
        } else {
            showNotification("無法載入標籤圖片");
        }
    } catch (error) {
        console.error("載入標籤圖片錯誤:", error);
        showNotification("載入標籤圖片時發生錯誤");
    }
  }

  // 新增的預覽幀加載函數
  async function loadPreviewFrames() {
      if (previewFramesLoaded) return; // 如果已經加載過，則不執行

      // 隱藏加載按鈕
      loadPreviewFramesButton.style.display = 'none';

      const previewFramePromises = await fetchPreviewFrames(currentEpisode, currentFrameStart, currentFrameStart + 100, ""); // 假設 frameEnd 為 frameStart + 100

      previewFramePromises.forEach(framePromise => { // 處理 Promise 陣列
          const frameItem = document.createElement('div');
          frameItem.classList.add('preview-frame-item');
          const imgElement = document.createElement('img');

          frameItem.appendChild(imgElement);
          previewFramesContainer.appendChild(frameItem);

          // 添加 onload 事件處理器
          imgElement.onload = () => {
              imgElement.style.opacity = 1; // 圖片載入完成後，將透明度設為 1，觸發 CSS transition 淡入效果
          };

          framePromise.then(frameBlob => { // 處理 Promise
              if (frameBlob) {
                  const frameUrl = URL.createObjectURL(frameBlob); // 將預覽幀 Blob 轉換為 URL
                  imgElement.src = frameUrl; // 使用 Blob URL (設定 src 會觸發圖片載入)
                  imgElement.addEventListener('click', function() { // 預覽圖點擊事件
                      viewerMainImage.src = frameUrl; // 切換主預覽圖片
                      // 移除其他預覽圖的 selected class
                      const allFrameItems = previewFramesContainer.querySelectorAll('.preview-frame-item');
                      allFrameItems.forEach(item => item.classList.remove('selected'));
                      frameItem.classList.add('selected'); // 為當前點擊的預覽圖加上 selected class
                  });
              }
          }).catch(error => {
              console.error("預覽圖片載入錯誤:", error);
              imgElement.alt = "預覽圖片載入失敗"; // 顯示載入失敗alt文字
              frameItem.classList.add('preview-frame-error'); // 添加錯誤樣式
          });
      });

      previewFramesLoaded = true; // 設定預覽幀已加載
  }

  async function fetchPreviewFrames(episode, frameStart, frameEnd, text) { // 移除 selectedRange 參數
      const framePromises = []; // 修改這裡，儲存 Promise 而不是 Blob
      const frameNumbers = [];
      const frameInterval = 15; // 每隔 15 幀取樣
      const previewCount = 5; // 總共 5 張預覽圖

      // 計算取樣幀數，以 frameStart 為中心，向前向後取樣
      for (let i = 0; i < previewCount; i++) {
          let frameOffset = (i - Math.floor(previewCount / 2)) * frameInterval; // 計算偏移量，讓中心幀為 frameStart
          let previewFrame = parseInt(frameStart) + frameOffset;

          if (previewFrame < 1) {
              previewFrame = 1; // 確保幀數不小於 1
          }
           frameNumbers.push(previewFrame);
      }


      for (const frame of frameNumbers) {
          const frameApiUrl = 'https://mygo-api.tomorin.cc/api/ave-frames';
          //  將 fetch 操作放入 Promise 陣列
          const framePromise =  fetch(frameApiUrl, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ episode: episode, frame_start: frame, frame_end: frameEnd, text: text }) //  傳遞 text 和 frameEnd
              })
              .then(response => {
                  if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`); // 處理 HTTP 錯誤
                  }
                  return response.blob(); // 取得 Blob 二進制資料
              })
              .catch(error => {
                  console.error("預覽圖片請求錯誤:", error);
                  return null; //  返回 null 或其他標記，表示載入失敗
              });
           framePromises.push(framePromise); // 修改這裡，儲存 Promise
      }
      return framePromises; // 修改這裡，返回 Promise 陣列
  }


  async function copyImage(imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // 將 JPEG Blob 轉換為 PNG Blob
        const pngBlob = await convertJpegToPngBlob(blob);

        const data = new ClipboardItem({
            [pngBlob.type]: pngBlob, // 使用 pngBlob 和 pngBlob.type
        });
        await navigator.clipboard.write([data]);
        showNotification('圖片已複製到剪貼簿！');
        } catch (err) {
            console.error("複製圖片失敗", err);
            showNotification("因瀏覽器限制，請長按圖片複製!");
        }
    }

  async function convertJpegToPngBlob(jpegBlob) {
      return new Promise((resolve, reject) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();

          img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              canvas.toBlob(blob => {
                  if (blob) {
                      resolve(blob); // 返回 PNG Blob
                  } else {
                      reject(new Error("轉換為 PNG Blob 失敗"));
                  }
              }, 'image/png'); // 轉換為 PNG 格式
          };
          img.onerror = (error) => {
              reject(error);
          };

          const url = URL.createObjectURL(jpegBlob);
          img.src = url;
      });
  }


  function showNotification(message) {
    hideNotification(); //  先隱藏之前的通知 (如果有的話)

    const notificationDiv = document.createElement('div');
    notificationDiv.classList.add('notification-message');
    notificationDiv.textContent = message;
    notificationContainer.appendChild(notificationDiv);

    //  自動隱藏通知
    setTimeout(() => {
        hideNotification();
    }, 3500); //  3.5 秒後隱藏
  }

  function hideNotification() {
      notificationContainer.innerHTML = ''; //  清空容器，移除所有通知
  }

  function displayCharacterInfo(characters) {
      const characterInfoContainer = document.getElementById('character-info');
      characterInfoContainer.innerHTML = ''; // 清空之前的信息

      if (characters.length === 0) {
          characterInfoContainer.textContent = '沒有角色訊息';
          return;
      }

      const table = document.createElement('table');
      table.classList.add('character-table');

      // 創建第一行：角色名稱
      const nameRow = document.createElement('tr');
      characters.forEach(character => {
          const nameCell = document.createElement('th');
          nameCell.textContent = `${character.name}`;
          nameRow.appendChild(nameCell);
      });
      table.appendChild(nameRow);

      // 創建第二行：置信度
      const confidenceRow = document.createElement('tr');
      characters.forEach(character => {
          const confidenceCell = document.createElement('td');
          const confidencePercentage = (character.confidence * 100).toFixed(2);
          confidenceCell.textContent = `${confidencePercentage}%`;

          // 根據置信度添加不同的 CSS 類別
          if (parseFloat(confidencePercentage) >= 50) {
              confidenceCell.classList.add('confidence-high');
          } else {
              confidenceCell.classList.add('confidence-low');
          }

          confidenceRow.appendChild(confidenceCell);
      });
      table.appendChild(confidenceRow);

      characterInfoContainer.appendChild(table);
  }

  function showProgress(completed, total, startTime) {
    const elapsedTime = (Date.now() - startTime) / 1000; // 计算已用时间（秒）
    const averageTimePerImage = (elapsedTime / completed).toFixed(1); // 计算平均每张图片的加载时间
    const progressMessage = `${completed}/${total}張... ${averageTimePerImage}秒/張`;
    const progressElement = document.getElementById('progress-container');
    progressElement.textContent = progressMessage; // 更新進度信息
  }

  // 新增函數 - 切換 GIF 模式
  function toggleGifMode() {
      gifMode = !gifMode;
      const gifContainer = document.getElementById('gif-maker-container');
      if (gifMode) {
          startFrame = parseInt(currentFrameStart);
          endFrame = parseInt(currentFrameEnd);
          updateSliders(); // 初始化时更新滑杆
          gifContainer.style.display = 'flex';
          previewFramesContainer.style.display = 'none';
          loadGifFrames();
      } else {
          gifContainer.style.display = 'none';
          previewFramesContainer.style.display = 'flex';
      }
  }

  // 修改 loadGifFrames 函式，加入圖片預載入
  async function loadGifFrames() {
      const gifStartContainer = document.getElementById('gif-start-frame');
      const gifEndContainer = document.getElementById('gif-end-frame');
      
      // 顯示載入動畫
      showLoadingAnimation(gifStartContainer, gifEndContainer);

      try {
          // 並行加載兩個幀
          const [startBlob, endBlob] = await Promise.all([
              fetchSingleFrame(currentEpisode, startFrame),
              fetchSingleFrame(currentEpisode, endFrame)
          ]);

          // 使用 requestAnimationFrame 確保流暢更新
          requestAnimationFrame(() => {
              updateFrameContainer(gifStartContainer, startBlob, 'start');
              updateFrameContainer(gifEndContainer, endBlob, 'end');
              hideLoadingAnimation();
          });

          startSlider.max = 100; // 直接設定預設最大值
          endSlider.max = 100;  // 直接設定預設最大值
          updateSliders();

          // 移動端特殊處理
          if (window.innerWidth <= 768) {
              document.querySelectorAll('.gif-frame-control').forEach(control => {
                  control.style.flexDirection = 'column';
                  control.querySelector('img').style.maxHeight = '40vh';
              });
              
              document.getElementById('gif-result').style.maxWidth = '95vw';
          }
      } catch (error) {
          console.error("幀加載失敗:", error);
          hideLoadingAnimation();
      }
  }

  function updateFrameContainer(container, blob, type) {
      const url = URL.createObjectURL(blob);
      container.innerHTML = `
          <div class="gif-frame-control">
              <img src="${url}" alt="${type} frame" style="opacity:0" onload="this.style.opacity='1'">
          </div>
      `;
  }

  // 新增載入動畫控制
  function showLoadingAnimation(...containers) {
      containers.forEach(container => {
          container.innerHTML = '<div class="loading-spinner"></div>';
      });
  }

  function hideLoadingAnimation() {
      document.querySelectorAll('.loading-spinner').forEach(spinner => {
          spinner.remove();
      });
  }

  // 新增函數 - 取得單一幀
  async function fetchSingleFrame(episode, frame) {
      try {
          const response = await fetch('https://mygo-api.tomorin.cc/api/ave-frames', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({episode, frame_start: frame, frame_end: frame})
          });
          return await response.blob();
      } catch (error) {
          console.error("幀加載失敗:", error);
          return null;
      }
  }

  // 新增調整函數
  function adjustFrameByDelta(frameType, delta) {
      let oldValue = (frameType === 'start') ? startFrame : endFrame;
      let newValue = Math.max(1, oldValue + delta);
      
      if (frameType === 'start') {
          startFrame = Math.min(newValue, endFrame);
      } else {
          endFrame = Math.max(newValue, startFrame);
      }
      
      updateSliders();
      updateSingleFrame(frameType);
  }

  // 新增函式 - 單一幀更新
  async function updateSingleFrame(type) {
      const container = document.getElementById(`gif-${type}-frame`);
      const frameNumber = type === 'start' ? startFrame : endFrame;
      
      showLoadingAnimation(container);
      
      try {
          const blob = await fetchSingleFrame(currentEpisode, frameNumber);
          updateFrameContainer(container, blob, type);
      } catch (error) {
          console.error("幀加載失敗:", error);
          hideLoadingAnimation();
      }
  }

  // 新增函式 - 綁定事件
  function bindFrameEvents(container, type) {
      container.querySelectorAll('.frame-nav-btn').forEach(button => {
          button.addEventListener('click', function() {
              const delta = this.textContent === '◀' ? -1 : 1;
              adjustFrameByDelta(type, delta);
          });
      });
  }

  // 修改 createGifFrameHtml 函式
  function createGifFrameHtml(blob, type) {
      const url = URL.createObjectURL(blob);
      return `
          <div class="gif-frame-control">
              <button class="frame-nav-btn">◀</button>
              <img src="${url}" alt="${type} frame">
              <button class="frame-nav-btn">▶</button>
              <div class="frame-number">${type === 'start' ? startFrame : endFrame}</div>
          </div>
      `;
  }

  // 修改生成 GIF 按鈕的綁定方式
  document.getElementById('generate-gif-btn').addEventListener('click', generateGif);
  document.getElementById('exit-gif-mode').addEventListener('click', toggleGifMode);

  // 新增函數 - 生成 GIF
  async function generateGif() {
      if (endFrame - startFrame > 300) {
          showNotification("GIF 長度不能超過 300 幀");
          return;
      }

      const gifResult = document.getElementById('gif-result');
      // 清空結果容器並顯示加載動畫
      gifResult.innerHTML = `
          <div class="gif-loading">
              <i class="fas fa-spinner fa-spin"></i>
              <p>生成中... 通常需要 5-10 秒</p>
          </div>
      `;

      const requestData = {
          episode: currentEpisode,
          frame_start: startFrame,
          frame_end: endFrame
      };

      try {
          const response = await fetch('https://mygo-api.tomorin.cc/api/ave-gif', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json' 
              },
              body: JSON.stringify(requestData)
          });
          
          const gifBlob = await response.blob();
          const gifUrl = URL.createObjectURL(gifBlob);
          gifResult.innerHTML = `
              <img src="${gifUrl}" alt="生成的 GIF">
              <button onclick="window.downloadGif('${gifUrl}')">下載 GIF</button>
          `;
      } catch (error) {
          console.error("GIF 生成失敗:", error);
          gifResult.innerHTML = ''; // 清除加載動畫
          showNotification("GIF 生成失敗，請稍後再試");
      }
  }

  // 修改函数定义，将 downloadGif 设为全局函数
  window.downloadGif = function(url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `ave_mujica_${startFrame}-${endFrame}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  }

  // 新增更新滑杆函数
  function updateSliders() {
      document.getElementById('start-frame-input').value = startFrame;
      document.getElementById('end-frame-input').value = endFrame;
  }

  // 确保函数全局可用
  window.updateSliders = updateSliders;
  window.updateSingleFrame = updateSingleFrame;

  // 新增切換函式
  function toggleCharacterInfo() {
      const characterInfo = document.getElementById('character-info');
      isCharacterInfoVisible = !isCharacterInfoVisible;
      
      characterInfo.style.display = isCharacterInfoVisible ? 'block' : 'none';
      toggleCharacterInfoBtn.querySelector('.text').textContent = 
          isCharacterInfoVisible ? '隱藏資訊' : '角色資訊';
  }

});
