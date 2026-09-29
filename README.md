# 🎯 Object Detection and Tracking

A real-time computer vision project that detects and tracks objects in video using **OpenCV** and a pre-trained deep learning model such as **YOLO**.

The system captures video from a webcam or video file, detects objects in every frame, assigns unique tracking IDs, and displays bounding boxes, object labels, confidence scores, and tracking information in real time.

---

## 📌 Project Overview

Object detection identifies **what objects are present and where they are located**, while object tracking maintains the identity of detected objects as they move across consecutive video frames.

This project combines:

* 🎥 Real-time video processing
* 🧠 Deep learning-based object detection
* 📦 Bounding box detection
* 🔄 Multi-object tracking
* 🆔 Unique tracking IDs
* 📊 Confidence scores
* 🖥️ Real-time visualization

---

## 🎯 Objectives

* Capture real-time video using a webcam or video file.
* Detect objects using a pre-trained YOLO model.
* Process video frames using OpenCV.
* Draw bounding boxes around detected objects.
* Display object labels and confidence scores.
* Track detected objects across consecutive frames.
* Assign unique IDs to individual objects.
* Display the processed video in real time.

---

## 🛠️ Technologies Used

* **Python**
* **OpenCV**
* **YOLO**
* **NumPy**
* **Deep Learning**
* **SORT / Deep SORT**
* **Computer Vision**

---

## 🧠 System Architecture

```text
              Video Input
             /            \
        Webcam          Video File
             \            /
              ↓
          OpenCV Capture
              ↓
        Frame Processing
              ↓
        YOLO Object Detection
              ↓
      Bounding Boxes + Labels
              ↓
        Object Tracking
        (SORT / Deep SORT)
              ↓
       Tracking IDs Assigned
              ↓
        Real-Time Display
```

---

## 📂 Project Structure

```text
Object-Detection-and-Tracking/
│
├── models/
│   └── yolov8n.pt
│
├── input/
│   └── test_video.mp4
│
├── output/
│   └── tracked_output.mp4
│
├── src/
│   ├── detection.py
│   ├── tracking.py
│   └── main.py
│
├── requirements.txt
├── README.md
└── .gitignore
```

---

## 📥 1. Video Input

The project supports two types of video input:

### Webcam

The computer's webcam can be used for real-time detection.

```python
import cv2

cap = cv2.VideoCapture(0)
```

### Video File

A prerecorded video can also be processed.

```python
cap = cv2.VideoCapture("input/test_video.mp4")
```

---

## 🧠 2. Object Detection Using YOLO

YOLO (**You Only Look Once**) is a real-time object detection model capable of detecting multiple objects in a single image.

The model can detect common objects such as:

```text
Person
Car
Bus
Truck
Bicycle
Motorcycle
Dog
Cat
Chair
Bottle
...etc.
```

Example:

```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")

results = model(frame)
```

The detector provides:

* Object class
* Bounding box coordinates
* Confidence score

---

## 📦 3. Bounding Boxes

Detected objects are represented using rectangular bounding boxes.

```text
        ┌─────────────────────┐
        │                     │
        │       PERSON        │
        │                     │
        │                     │
        └─────────────────────┘
          Person  0.94  ID: 3
```

The displayed information can include:

```text
Object Label
Confidence
Tracking ID
```

Example:

```text
Person  94%  ID: 3
Car     89%  ID: 7
Dog     91%  ID: 2
```

---

## 🔄 4. Object Tracking

Detection identifies objects in individual frames.

Tracking connects those detections across frames and maintains their identities.

For example:

```text
Frame 1 → Person → ID 1
Frame 2 → Person → ID 1
Frame 3 → Person → ID 1
Frame 4 → Person → ID 1
```

Even though the person moves, the tracker attempts to maintain the same ID.

---

## 🚀 5. SORT Tracking

SORT (**Simple Online and Realtime Tracking**) can be used to track detected objects.

Its main components include:

* Kalman Filter
* Hungarian Algorithm
* Bounding box association

Basic workflow:

```text
YOLO Detection
      ↓
Bounding Boxes
      ↓
SORT Tracker
      ↓
Object Association
      ↓
Tracking IDs
```

---

## 🧠 6. Deep SORT

Deep SORT extends SORT by incorporating appearance information.

This can improve object identity preservation when objects:

* Move quickly
* Cross paths
* Temporarily disappear
* Reappear in the scene

Example:

```python
from deep_sort_realtime.deepsort_tracker import DeepSort

tracker = DeepSort(max_age=30)

tracks = tracker.update_tracks(
    detections,
    frame=frame
)
```

---

## 🖥️ 7. Real-Time Processing

Each video frame follows this process:

```text
Capture Frame
     ↓
Resize / Preprocess
     ↓
YOLO Detection
     ↓
Extract Detections
     ↓
Object Tracker
     ↓
Assign Tracking IDs
     ↓
Draw Bounding Boxes
     ↓
Display Frame
```

The processed frame is then displayed using OpenCV.

```python
cv2.imshow("Object Detection and Tracking", frame)
```

Press `q` to stop the application.

---

## 📊 Information Displayed

The application can display:

| Information  | Description              |
| ------------ | ------------------------ |
| Object Label | Detected object class    |
| Confidence   | Detection confidence     |
| Bounding Box | Object location          |
| Tracking ID  | Unique object identifier |
| FPS          | Processing speed         |

Example:

```text
Person  0.96  ID: 1
Car     0.91  ID: 2
Bicycle 0.87  ID: 3
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/Object-Detection-and-Tracking.git
```

### 2. Navigate to the project

```bash
cd Object-Detection-and-Tracking
```

### 3. Create a virtual environment

```bash
python -m venv venv
```

### 4. Activate the environment

#### Windows

```bash
venv\Scripts\activate
```

#### Linux / macOS

```bash
source venv/bin/activate
```

### 5. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 📦 Requirements

Example `requirements.txt`:

```text
opencv-python
ultralytics
numpy
deep-sort-realtime
```

If SORT is used instead of Deep SORT, install the required SORT implementation and its dependencies.

---

## ▶️ How to Run

### Webcam Mode

```bash
python src/main.py
```

The application will open the webcam and begin detecting and tracking objects.

### Video Mode

Change the input source in the application:

```python
cap = cv2.VideoCapture("input/test_video.mp4")
```

Then run:

```bash
python src/main.py
```

---

## 💻 Example Main Code

```python
import cv2
from ultralytics import YOLO

model = YOLO("yolov8n.pt")

cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()

    if not ret:
        break

    results = model(frame)

    annotated_frame = results[0].plot()

    cv2.imshow(
        "Object Detection",
        annotated_frame
    )

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
```

---

## ✨ Features

* 🎥 Webcam support
* 📹 Video file support
* 🧠 YOLO-based object detection
* 📦 Bounding box visualization
* 🏷️ Object labels
* 📊 Confidence scores
* 🔄 Multi-object tracking
* 🆔 Unique tracking IDs
* ⚡ Real-time processing
* 💾 Processed video output

---

## 📈 Applications

This technology can be used in:

* 🚗 Traffic monitoring
* 🏙️ Smart city systems
* 👥 People counting
* 🚶 Pedestrian tracking
* 🏭 Industrial monitoring
* 🛡️ Security systems
* 🛒 Retail analytics
* 🚦 Traffic analysis
* 🤖 Robotics
* 📹 Video surveillance

---

## ⚠️ Limitations

* Detection accuracy depends on the trained model.
* Performance depends on CPU/GPU capabilities.
* Low-light conditions can reduce detection accuracy.
* Occlusion can cause tracking IDs to change.
* Very fast-moving objects may be difficult to track.
* Real-time performance depends on video resolution and model size.

---

## 🚀 Future Improvements

* Add real-time people counting.
* Add vehicle counting.
* Implement line-crossing detection.
* Add speed estimation.
* Add object entry/exit detection.
* Add multiple camera support.
* Add object-specific tracking.
* Add a web dashboard.
* Store tracking statistics in a database.
* Deploy the system on edge devices.
* Experiment with newer YOLO models.
* Improve tracking using appearance-based embeddings.

---

## 📊 Performance

Performance can be measured using:

* FPS (Frames Per Second)
* Detection accuracy
* Precision
* Recall
* mAP (Mean Average Precision)
* ID tracking consistency

The actual performance depends on the model, hardware, input resolution, and video complexity.

---

## 📜 License

This project is intended for educational and research purposes.

If pretrained models or external datasets are used, follow their respective licenses and attribution requirements.

---

## 👨‍💻 Author

**Roys Sudhan B.**

AI/ML Engineering Student
Bengaluru, Karnataka, India

### Interests

* Artificial Intelligence
* Machine Learning
* Computer Vision
* Generative AI
* Android Development

---

## ⭐ Acknowledgements

* OpenCV
* Ultralytics YOLO
* Deep SORT
* SORT
* NumPy
* Python
* Open-source computer vision community

---

## 🎯 Project Goal

> **Detect objects, understand their movement, and maintain their identity in real-time video.**

🎥 **Input:** Webcam / Video
🧠 **Detection:** YOLO
🔄 **Tracking:** SORT / Deep SORT
📦 **O**
