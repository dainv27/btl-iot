#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "dainv_24";
const char* password = "vannhucu@";

// MQTT settings
const char* mqtt_server = "localhost";
const int mqtt_port = 1883;
const char* mqtt_topic = "iot/sensor/data";

// Fake data settings
float baseTemperature = 25.0;
float baseHumidity = 60.0;

// WiFi and MQTT clients
WiFiClient espClient;
PubSubClient client(espClient);

// Timing variables
unsigned long lastMsg = 0;
const unsigned long interval = 5000; // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  
  // Initialize random seed for fake data
  randomSeed(analogRead(0));
  
  // Connect to WiFi
  setup_wifi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // Create a random client ID
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > interval) {
    lastMsg = now;
    
    // Generate fake sensor data with some variation
    float temperature = baseTemperature + random(-50, 50) / 10.0; // ±5°C variation
    float humidity = baseHumidity + random(-200, 200) / 10.0;    // ±20% variation
    
    // Ensure values are within reasonable ranges
    temperature = constrain(temperature, 15.0, 35.0);
    humidity = constrain(humidity, 30.0, 90.0);
    
    // Create JSON document
    StaticJsonDocument<200> doc;
    doc["device_id"] = "ESP32_001";
    doc["timestamp"] = now;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["location"] = "Room_1";
    
    // Serialize JSON to string
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Publish to MQTT
    Serial.print("Publishing: ");
    Serial.println(jsonString);
    client.publish(mqtt_topic, jsonString.c_str());
    
    // Print to serial for debugging
    Serial.print("Fake Temperature: ");
    Serial.print(temperature);
    Serial.print("°C, Fake Humidity: ");
    Serial.print(humidity);
    Serial.println("%");
  }
}
