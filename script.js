document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('keyword');
    const searchButton = document.getElementById('search-btn');
    const resultsContainer = document.getElementById('results-container');

    searchButton.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    async function performSearch() { // 將 performSearch 改為 async 函式
        const keyword = searchInput.value.trim();
        if (!keyword) {
            alert("請輸入關鍵字！");
            return;
        }

        const apiUrl = `https://mygo-api.tomorin.cc/api/ave-search?keyword=${encodeURIComponent(keyword)}`;
        resultsContainer.innerHTML = '搜尋中...'; // 顯示搜尋中訊息
        try {
          const response = await fetch(apiUrl);
          const data = await response.json();
          resultsContainer.innerHTML = ''; // 清空搜尋中訊息
          if (data && data.data && data.data.length > 0) {
             // 使用 for...of 迴圈，並加上 await 來一個一個處理結果
             for (const result of data.data) {
                await fetchImage(result);
             }
          } else {
            resultsContainer.innerHTML = '<p>沒有搜尋到相關結果。</p>';
          }
        } catch(error) {
          resultsContainer.innerHTML = '<p>搜尋時發生錯誤，請稍後再試。</p>';
           console.error("搜尋錯誤:", error);
        }
    }

    async function fetchImage(result) { // 將 fetchImage 改為 async 函式
      const frameApiUrl = 'https://mygo-api.tomorin.cc/api/ave-frames';
       try {
         const response = await fetch(frameApiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
            body: JSON.stringify(result)
        });
        const imageData = await response.json();
        displayResult(result, imageData.url);
      } catch (error) {
            console.error("圖片請求錯誤:", error);
            displayResult(result, null, "圖片載入失敗");
        }
    }

    function displayResult(result, imageUrl, errorMsg) {
        const resultItem = document.createElement('div');
        resultItem.classList.add('result-item');
        let content = '';
         if (imageUrl) {
             content += `<img src="${imageUrl}" alt="台詞截圖">`;
         }

        let textOverlay = `<div class="text-overlay">${result.text}</div>`;
        if (errorMsg){
           textOverlay = `<div class="text-overlay">${errorMsg}</div>`;
        }

        content += textOverlay;
        resultItem.innerHTML = content;
        resultsContainer.appendChild(resultItem);
    }
});