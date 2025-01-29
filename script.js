document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('keyword');
  const searchButton = document.getElementById('search-btn');
  const resultsContainer = document.getElementById('results-container');
  const imageViewerModal = document.getElementById('image-viewer-modal');
  const closeViewerButton = document.getElementById('close-viewer');
  const viewerMainImage = document.getElementById('viewer-main-image');
  const previewFramesContainer = document.getElementById('preview-frames');
  const viewerCopyButton = document.getElementById('viewer-copy-button');
  const viewerDownloadButton = document.getElementById('viewer-download-button');
  const notificationContainer = document.getElementById('notification-container');
  const viewerToggleButton = document.getElementById('viewer-toggle-button');

  viewerToggleButton.addEventListener('click', async function() {
    const mainImageUrl = viewerMainImage.src;
    const originalImageUrl = viewerMainImage.dataset.originalSrc || mainImageUrl;
    
    const currentResult = {
      type: viewerMainImage.dataset.type,
      episode: viewerMainImage.dataset.episode,
      frame_start: viewerMainImage.dataset.frameStart,
      scene_number: viewerMainImage.dataset.sceneNumber
    };

    if (mainImageUrl === originalImageUrl) {
      let apiUrl;
      if (currentResult.type === 'ocr') {
        apiUrl = `https://mygo-api.tomorin.cc/api/label_visualization?type=ocr&episode=${currentResult.episode}&frame_start=${currentResult.frame_start}`;
      } else if (currentResult.type === 'scene') {
        apiUrl = `https://mygo-api.tomorin.cc/api/label_visualization?type=scene&episode=${currentResult.episode}&scene_number=${currentResult.scene_number}`;
      } else {
        console.error("未知的类型:", currentResult.type);
        showNotification("未知的类型，无法切换图片。");
        return;
      }

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        viewerMainImage.src = imageUrl;
      } catch (error) {
        console.error("切換圖片錯誤:", error);
        showNotification("切換圖片失敗，請稍後再試。");
      }
    } else {
      viewerMainImage.src = originalImageUrl;
    }
  });

  searchButton.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      performSearch();
    }
  });
  closeViewerButton.addEventListener('click', closeImageViewer);
  viewerCopyButton.addEventListener('click', copyViewerImage);
  viewerDownloadButton.addEventListener('click', downloadViewerImage);

  function closeImageViewer() {
    imageViewerModal.classList.add('hidden');
    previewFramesContainer.innerHTML = '';
  }

  function copyViewerImage() {
    copyImage(viewerMainImage.src);
  }

  function downloadViewerImage() {
    downloadImage(viewerMainImage.src);
  }

  function downloadImage(imageUrl) {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'ave_mujica_frame.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function performSearch() {
    const keyword = searchInput.value.trim();
    const checkedSearchType = document.querySelector('input[name="search-type"]:checked');
    const searchType = checkedSearchType ? checkedSearchType.value : 'both';
    const characterFilter = Array.from(document.querySelectorAll('.character-filter-options input[type="checkbox"]:checked')).map(checkbox => checkbox.value);

    if (!keyword) {
      showNotification("請輸入關鍵字");
      return;
    }

    const apiUrl = `https://mygo-api.tomorin.cc/api/ave-search?keyword=${encodeURIComponent(keyword)}&search_type=${searchType}&characters=${encodeURIComponent(characterFilter.join(','))}`;
    resultsContainer.innerHTML = `
      <div class="w-full gap-x-2 flex justify-center items-center">
        <div class="w-5 bg-[#d991c2] animate-pulse h-5 rounded-full animate-bounce"></div>
        <div class="w-5 animate-pulse h-5 bg-[#9869b8] rounded-full animate-bounce"></div>
        <div class="w-5 h-5 animate-pulse bg-[#6756cc] rounded-full animate-bounce"></div>
      </div>
    `;
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      resultsContainer.innerHTML = '';
      if (data && data.data && data.data.length > 0) {
        for (const result of data.data) {
          await fetchImage(result);
        }
      } else {
        resultsContainer.innerHTML = '<p>沒有搜尋到相關結果。</p>';
      }
    } catch (error) {
      resultsContainer.innerHTML = '<p>搜尋時發生錯誤，請稍後再試。</p>';
      console.error("搜尋錯誤:", error);
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
        })
      });
      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);
      displayResult(result, imageUrl, null, result.episode, result.text, result.frame_start, result.frame_end);
    } catch (error) {
      console.error("圖片請求錯誤:", error);
      displayResult(result, null, "圖片載入失敗", result.episode, result.text, result.frame_start, result.frame_end);
    }
  }

  function displayResult(result, imageUrl, errorMsg, episode, text, frameStart, frameEnd) {
    const resultItem = document.createElement('div');
    resultItem.classList.add('result-item', 'border', 'border-gray-300', 'rounded-lg', 'overflow-hidden', 'shadow-md', 'mb-4', 'relative');

    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = "台詞截圖";
      img.classList.add('w-full', 'h-auto');
      img.dataset.originalSrc = imageUrl;
      img.dataset.type = result.type;
      img.dataset.episode = episode;
      img.dataset.frameStart = frameStart;
      img.dataset.sceneNumber = result.scene_number;
      resultItem.appendChild(img);

      resultItem.addEventListener('click', function () {
        openImageViewer(imageUrl, episode, frameStart, frameEnd, text, result.type, result.scene_number, result.characters);
      });

      const toggleButton = document.createElement('button');
      toggleButton.classList.add('absolute', 'bottom-2', 'left-2', 'bg-black', 'bg-opacity-50', 'text-white', 'px-3', 'py-1', 'rounded');
      toggleButton.innerText = '切換圖片';
      toggleButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        await toggleImage(result, img);
      });
      resultItem.appendChild(toggleButton);
    }

    const textOverlay = document.createElement('div');
    textOverlay.classList.add('text-overlay', 'bg-black', 'bg-opacity-60', 'text-white', 'p-2', 'text-sm', 'absolute', 'bottom-0', 'right-0', 'm-2', 'rounded');
    textOverlay.innerText = errorMsg ? errorMsg : `#${episode} - ${text || "場景"}`;
    resultItem.appendChild(textOverlay);

    const copyButton = document.createElement('button');
    copyButton.classList.add('copy-button', 'absolute', 'top-2', 'right-2', 'bg-white', 'bg-opacity-70', 'rounded-full', 'p-2', 'hover:bg-opacity-100', 'transition');
    copyButton.innerHTML = '<i class="fas fa-copy"></i>';
    copyButton.addEventListener('click', (event) => {
      event.stopPropagation();
      if (imageUrl) {
        copyImage(imageUrl);
      }
    });
    resultItem.appendChild(copyButton);

    resultsContainer.appendChild(resultItem);
  }

  function openImageViewer(mainImageUrl, episode, frameStart, frameEnd, text, type, sceneNumber, characters) {
    const imageViewerModal = document.getElementById('image-viewer-modal');
      imageViewerModal.classList.remove('hidden');
      imageViewerModal.classList.add('show');
    viewerMainImage.src = mainImageUrl;
    viewerMainImage.dataset.originalSrc = mainImageUrl;
    viewerMainImage.dataset.type = type;
    viewerMainImage.dataset.episode = episode;
    viewerMainImage.dataset.frameStart = frameStart;
    viewerMainImage.dataset.sceneNumber = sceneNumber;
    displayCharacterInfo(characters);
    fetchPreviewFrames(episode, frameStart, frameEnd, text).then(displayPreviewFrames);
    centerModal(imageViewerModal);
  }

  function displayCharacterInfo(characters) {
      const characterInfoContainer = document.getElementById('character-info');
      characterInfoContainer.innerHTML = '';

      if (characters.length === 0) {
          characterInfoContainer.textContent = '沒有角色信息';
          return;
      }

      const table = document.createElement('table');
      table.classList.add('character-table', 'w-auto', 'text-center', 'mt-4');
      table.style.transformOrigin = 'left center';
      const nameRow = document.createElement('tr');

      characters.forEach(character => {
          const nameCell = document.createElement('th');
          nameCell.textContent = `${character.name}`;
          nameCell.classList.add('p-1', 'bg-gray-200');
          nameRow.appendChild(nameCell);
      });
      table.appendChild(nameRow);

      const confidenceRow = document.createElement('tr');
      characters.forEach(character => {
          const confidenceCell = document.createElement('td');
          const confidencePercentage = (character.confidence * 100).toFixed(2);

          const radialProgress = document.createElement('div');
          radialProgress.classList.add('radial-progress');
          radialProgress.setAttribute('style', `--value:${confidencePercentage};`);
          radialProgress.setAttribute('role', 'progressbar');
          radialProgress.setAttribute('aria-label', 'Radial Progressbar');
          radialProgress.textContent = `${confidencePercentage}%`;

          if (confidencePercentage >= 50) {
              radialProgress.classList.add('text-success');
          } else {
              radialProgress.classList.add('text-error');
          }
          confidenceCell.appendChild(radialProgress);
          confidenceRow.appendChild(confidenceCell);
      });
      table.appendChild(confidenceRow);
      characterInfoContainer.appendChild(table);


    function adjustTableScale() {
        const infoWidth = characterInfoContainer.offsetWidth;
        const tableWidth = table.offsetWidth;

        if (tableWidth > infoWidth) {
            const scaleFactor = infoWidth / tableWidth;
            table.style.transform = `scale(${scaleFactor})`;
        } else {
            table.style.transform = 'scale(1)';
        }
    }
     adjustTableScale();
    window.addEventListener('resize', adjustTableScale);
  }


  async function fetchPreviewFrames(episode, frameStart, frameEnd, text) {
    const framePromises = [];
    const frameNumbers = [];
    const frameInterval = 15;
    const previewCount = 5;

    for (let i = 0; i < previewCount; i++) {
      let frameOffset = (i - Math.floor(previewCount / 2)) * frameInterval;
      let previewFrame = parseInt(frameStart) + frameOffset;
      if (previewFrame < 1) {
        previewFrame = 1;
      }
      if(previewFrame > parseInt(frameEnd)) {
        previewFrame = parseInt(frameEnd);
      }
      frameNumbers.push(previewFrame);
    }

    for (const frame of frameNumbers) {
      const frameApiUrl = 'https://mygo-api.tomorin.cc/api/ave-frames';
      const framePromise = fetch(frameApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ episode: episode, frame_start: frame, frame_end: frameEnd, text: text })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .catch(error => {
        console.error("預覽圖片請求錯誤:", error);
        return null;
      });
      framePromises.push(framePromise);
    }
    return Promise.all(framePromises);
  }

  function displayPreviewFrames(previewFrames) {
    previewFramesContainer.innerHTML = '';
    previewFrames.forEach(async (frameBlob, index) => {
      const frameImage = document.createElement('img');
      frameImage.src = URL.createObjectURL(frameBlob);
      frameImage.alt = `Preview Frame ${index + 1}`;
      frameImage.classList.add('w-full', 'h-auto', 'mb-4');
      previewFramesContainer.appendChild(frameImage);
    });
  }

  async function copyImage(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const pngBlob = await convertJpegToPngBlob(blob);
      const data = new ClipboardItem({
        [pngBlob.type]: pngBlob,
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
            resolve(blob);
          } else {
            reject(new Error("轉換為 PNG Blob 失敗"));
          }
        }, 'image/png');
      };
      img.onerror = (error) => {
        reject(error);
      };

      const url = URL.createObjectURL(jpegBlob);
      img.src = url;
    });
  }

  async function toggleImage(result, imgElement) {
      const originalImageUrl = imgElement.dataset.originalSrc || imgElement.src;
      
      if (imgElement.src === originalImageUrl) {
      let apiUrl;
      if (result.type === 'ocr') {
          apiUrl = `https://mygo-api.tomorin.cc/api/label_visualization?type=ocr&episode=${result.episode}&frame_start=${result.frame_start}`;
      } else if (result.type === 'scene') {
          apiUrl = `https://mygo-api.tomorin.cc/api/label_visualization?type=scene&episode=${result.episode}&scene_number=${result.scene_number}`;
      } else {
          console.error("未知的类型:", result.type);
          showNotification("未知的类型，无法切换图片。");
          return;
      }

      try {
          const response = await fetch(apiUrl);
          if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
          }
          const imageBlob = await response.blob();
          const imageUrl = URL.createObjectURL(imageBlob);
          imgElement.src = imageUrl;
      } catch (error) {
          console.error("切換圖片錯誤:", error);
          showNotification("切換圖片失敗，請稍後再試。");
      }
      } else {
      imgElement.src = originalImageUrl;
      }
  }    
  
  function showNotification(message) {
    return new Promise(resolve => {
      hideNotification();
      const notificationDiv = document.createElement('div');
      notificationDiv.classList.add('notification-message', 'bg-blue-500', 'text-white', 'p-2', 'rounded', 'shadow-md', 'mb-4');
      notificationDiv.textContent = message;
      notificationContainer.appendChild(notificationDiv);
      setTimeout(() => {
        hideNotification();
        resolve();
      }, 3500);
    });
  }

  function hideNotification() {
    notificationContainer.innerHTML = '';
  }

  document.getElementById('close-viewer').addEventListener('click', function() {
    const modal = document.getElementById('image-viewer-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hidden');
    }
  });

  function centerModal(modal) {
    // modal.style.position = 'fixed';  移除
    // modal.style.top = '50%';  移除
    // modal.style.left = '50%';  移除
    // modal.style.transform = 'translate(-50%, -50%)';  移除
  }
});