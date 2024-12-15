async function getServerCount() {
    try {
        const response = await axios.get('https://mygo-api.yichen0403.us.kg/api/ranks/total');
        if (response.data.status === 'success') {
            console.log(response.data.total_times);
            document.getElementById('serverCount').textContent = response.data.total_times;
        } else {
            document.getElementById('serverCount').textContent = '資料載入失敗';
        }
    } catch (error) {
        document.getElementById('serverCount').textContent = '資料載入失敗';
        console.error('Error:', error);
    }
}