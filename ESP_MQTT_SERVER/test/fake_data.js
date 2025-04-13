require('dotenv').config();
const mqtt = require('mqtt');

const client = mqtt.connect('mqtts://io.adafruit.com', {
  username: process.env.ADA_USERNAME,
  password: process.env.ADAFRUIT_IO_KEY
});

const feeds = [
  'temperature',
  'humidity',
  'airquality',
  'lightintensity',
  'motion',
  'pressure'
];

client.on('connect', () => {
  console.log('Đã kết nối đến Adafruit IO MQTT broker.');

  setInterval(async () => {
    try {
      await Promise.all(
        feeds.map(feed => {
          return new Promise((resolve, reject) => {
            const value = Math.floor(Math.random() * 100) + 1;
            const topic = `${process.env.ADA_USERNAME}/feeds/${feed}`;
            client.publish(topic, value.toString(), (err) => {
              if (err) {
                console.error(`Lỗi gửi đến feed "${feed}":`, err.message);
                reject(err);
              } else {
                console.log(`Đã gửi đến feed "${feed}": ${value}`);
                resolve();
              }
            });
          });
        })
      );
      console.log('Đã gửi dữ liệu đến tất cả các feeds.');
    } catch (error) {
      console.error('Có lỗi khi gửi dữ liệu:', error);
    }
  }, 1000); // Mn chỉnh timer để thay đổi thời gian send fake data
});
