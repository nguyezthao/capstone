import React, { useState, useEffect, useRef } from "react";
import style from "../style/dashboard.module.css";
import { Button, Table, Modal } from "antd";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const Dashboard = () => {
  const [isOn, setIsOn] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [resultInfo, setResultInfo] = useState({});
  const [isTableVisible, setIsTableVisible] = useState(false);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const videoRef = useRef(null);

  useEffect(() => {
    async function fetchDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoInputDevices);

        // Tự động chọn camera USB nếu có "USB" trong label
        const usbCam = videoInputDevices.find(device => device.label.toLowerCase().includes("usb"));
        if (usbCam) {
          setSelectedDeviceId(usbCam.deviceId);
        } else if (videoInputDevices.length > 0) {
          setSelectedDeviceId(videoInputDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Không thể lấy danh sách camera:", err);
      }
    }

    fetchDevices();
  }, []);

  useEffect(() => {
    async function startCamera() {
      if (!selectedDeviceId) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Không thể truy cập camera:", err);
      }
    }

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [selectedDeviceId]);

  const handleTurnOn = () => {
    setIsOn(true);
    socket.emit("relay_control", { state: "on" });  // Gửi trạng thái "on" đến backend
  };

  const handleTurnOff = () => {
    setIsOn(false);
    socket.emit("relay_control", { state: "off" }); // Gửi trạng thái "off" đến backend
  };

  useEffect(() => {
    socket.on("image_with_result", (data) => {
      setProcessedImage(`data:image/jpeg;base64,${data.processed_image}`);
      setResultInfo({
        result_label: data.result_label,
        error_count: data.error_count,
        ok_count: data.ok_count,
        object_count: data.object_count,
      });
    });

    return () => {
      socket.off("image_with_result");
    };
  }, []);

  useEffect(() => {
    socket.on("relay_status", (data) => {
      // Nhận trạng thái relay từ backend và cập nhật trạng thái trong frontend
      if (data.status === "on") {
        setIsOn(true);
      } else if (data.status === "off") {
        setIsOn(false);
      }
    });

    return () => {
      socket.off("relay_status");
    };
  }, []);

  const columns = [
    {
      title: "Tên lỗi",
      dataIndex: "name",
      filters: [
        { text: "Hàn lỗi chân", value: "Hàn lỗi chân" },
        { text: "Chưa hàn linh kiện", value: "Chưa hàn linh kiện" },
        { text: "Hàn dính chân", value: "Hàn dính chân" },
      ],
      filterMode: "tree",
      filterSearch: true,
      onFilter: (value, record) => record.name.startsWith(value),
      width: "30%",
    },
    {
      title: "Hình ảnh",
      dataIndex: "image",
      render: (src) => <img src={src} alt="Ảnh lỗi" width="100" />,
    },
  ];

  const data = processedImage
    ? [
        {
          key: "1",
          name: resultInfo.result_label || "Không xác định",
          image: processedImage,
        },
      ]
    : [];

  const onChange = (pagination, filters, sorter, extra) => {
    console.log("params", pagination, filters, sorter, extra);
  };

  const toggleTableVisibility = () => {
    setIsTableVisible(!isTableVisible);
  };

  return (
    <div>
      <div className={style.header}>
        <div className={style.title}>
          <h1>
            Hệ thống phát hiện, phân loại lỗi hàn linh kiện sử dụng Deep Learning
          </h1>
        </div>
        <div className={style.logo}>
          <img src="/image002.jpg" alt="Mô hình CNN" />
        </div>
      </div>

      <div className={style.container}>
        <div className={style.child1}>
          <div className={style.counter}>
            <div className={style.counter1}>
              <strong>Tổng mạch:</strong>
              <div>{resultInfo.object_count}</div>
            </div>
            <div className={style.counter2}>
              <strong>Số mạch đạt chuẩn:</strong>
              <div>{resultInfo.ok_count}</div>
            </div>
            <div className={style.counter3}>
              <strong>Số mạch lỗi:</strong>
              <div>{resultInfo.error_count}</div>
            </div>
          </div>

          {/* Livestream webcam */}
          <div className={style.livestream}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "10px",
                backgroundColor: "#000",
              }}
            ></video>
          </div>
        </div>

        <div className={style.child2}>
          <div className={style.control}>
            <h2>Điều khiển</h2>

            <Button
              type="primary"
              style={{
                marginRight: "15px",
                borderRadius: "10px",
                backgroundColor: isOn ? "#1890ff" : "#d9d9d9",
                color: isOn ? "#fff" : "#000",
                border: "none",
              }}
              onClick={handleTurnOn}
            >
              BẬT
            </Button>

            <Button
              style={{
                marginRight: "15px",
                borderRadius: "10px",
                backgroundColor: !isOn ? "#ff4d4f" : "#d9d9d9",
                color: !isOn ? "#fff" : "#000",
                border: "none",
              }}
              onClick={handleTurnOff}
            >
              TẮT
            </Button>

            <Button
              type="default"
              style={{ marginBottom: "15px" }}
              onClick={toggleTableVisibility}
            >
              {isTableVisible ? "...." : "Báo cáo chi tiết "}
            </Button>

            {processedImage && (
              <div style={{ marginBottom: "10px" }}>
                <img
                  src={processedImage}
                  alt="Ảnh đã xử lý"
                  width="400"
                  style={{ border: "1px solid #ccc", borderRadius: "8px" }}
                />
              </div>
            )}

            <hr />

            <Modal
              title="Danh sách lỗi"
              visible={isTableVisible}
              onCancel={toggleTableVisibility}
              footer={null}
              width="100%"
              style={{ top: 0 }}
              bodyStyle={{ height: "100vh", padding: "0" }}
            >
              <Table
                columns={columns}
                dataSource={data}
                onChange={onChange}
                pagination={false}
                scroll={{ y: "calc(100vh - 100px)" }}
              />
            </Modal>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
