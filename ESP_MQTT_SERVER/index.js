require('dotenv').config();
const express = require('express');
const axios = require('axios');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const cron = require('cron'); 
let fetch;

const app = express();
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = socketIo(server);

const routes = require('./src/routes/api.routes');
const sensorModel = require('./src/models/sensors.model'); 
const errorHandler = require('./src/middleware/errorHandler');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'graph.html'));
});

app.get('/detail', async (req, res) => {
  try {
    const data = await sensorModel.getAllSensorData();
    res.render('detail', { data });
  } catch (error) {
    res.status(500).send('Error retrieving data');
  }
});

io.on('connection', (socket) => {
  console.log('Client kết nối');
  socket.on('disconnect', () => {
    console.log('Client ngắt kết nối');
  });
});

const ADA_USERNAME = process.env.ADA_USERNAME;
const ADAFRUIT_IO_KEY = process.env.ADAFRUIT_IO_KEY;

const headers = {
  'X-AIO-Key': ADAFRUIT_IO_KEY,
  'Content-Type': 'application/json'
};

const feeds = [
  'airquality',
  'humidity',
  'lightintensity',
  'motion',
  'pressure',
  'temperature'
];

async function fetchAllFeeds() {
  try {
    const feedPromises = feeds.map(async (currentFeed) => {
      // console.log(`=== Lấy dữ liệu từ feed: ${currentFeed} ===`);
      const url = `https://io.adafruit.com/api/v2/${ADA_USERNAME}/feeds/${currentFeed}/data?limit=1`;
      try {
        const response = await axios.get(url, { headers });
        const data = response.data;
        if (data && data.length > 0) {
          const record = data[0];
          const feedValue = parseFloat(record.value);
          const createdAt = record.created_at;
          // console.log(`Feed: ${currentFeed} | Giá trị: ${feedValue} | Thời gian: ${createdAt}`);

          const sensorRecord = await sensorModel.getSensorByType(currentFeed);
          if (sensorRecord) {
            const sensorId = sensorRecord.sensor_id;
            const payload = {
              sensor_id: sensorId,
              svalue: feedValue,
              recorded_time: createdAt
            };

            const insertResult = await sensorModel.createSensorData(payload);
            // console.log(`Dữ liệu được lưu cho sensor_type "${currentFeed}" (sensor_id: ${sensorId}):`, insertResult);

            io.emit('newData', { feed: currentFeed, value: feedValue, created_at: createdAt });
          } else {
            console.error(`Không tìm thấy sensor nào với sensor_type: ${currentFeed}`);
          }
        } else {
          console.log(`Không có dữ liệu từ feed "${currentFeed}"`);
        }
      } catch (error) {
        console.error(`Lỗi khi fetch dữ liệu từ feed "${currentFeed}":`, error.message);
      }
    });

    await Promise.all(feedPromises);
  } catch (err) {
    console.error('Lỗi khi fetch dữ liệu từ Adafruit IO:', err.message);
  }
}

// Timer, nên tăng lên nha vì ADA nó có giới hạn số request trên 1 thời gian nhất định, để tầm 1s là đẹp á
setInterval(fetchAllFeeds, 1000);

app.use(errorHandler);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
