import { Camera, CameraType } from "expo-camera";
import { useRef, useState, useEffect  } from "react";
import {
  ActivityIndicator,
  Modal,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "./components/button";
import { GoogleGenerativeAI } from "@google/generative-ai";


export default function App() {
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [isPreview, setIsPreview] = useState(false);
  const [type, setType] = useState(CameraType.back);
  const [flash, setFlash] = useState(Camera.flash);
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [apiResponse, setApiResponse] = useState("");
  const [isFirstOpen, setIsFirstOpen] = useState(true); // Estado para el modal introductorio

  const cameraRef = useRef(null);
  const imageRef = useRef(null);

  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_API_KEY);

  useEffect(() => {
    // Mostrar el modal la primera vez que se abre la app
    if (isFirstOpen) {
      setIsFirstOpen(true);
    }
  }, []);

  const closeIntroModal = () => {
    setIsFirstOpen(false);
  };

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.permissionContainer}>
      <Text style={styles.permissionText}>
        Para usar esta aplicación, necesitamos acceso a tu cámara.
       </Text>
    <Button 
    onPress={requestPermission} 
    title="Conceder Permiso" 
    style={styles.permissionButton} 
  />
    </View>

    );
  }

  const toggleCameraType = () => {
    setType((current) =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
    cancelPreview();
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const options = { quality: 0.5, base64: true, skipProcessing: true };
        const data = await cameraRef.current.takePictureAsync(options);

        if (data.uri) {
          await cameraRef.current.pausePreview();
          setIsPreview(true);
          imageRef.current = data;
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const cancelPreview = async () => {
    await cameraRef.current.resumePreview();
    setIsPreview(false);
  };

  const runModel = async () => {
    setIsLoading(true);

    const data = {
      inlineData: {
        data: imageRef.current.base64,
        mimeType: "image/png",
      },
    };

    // fetch("https://jsonplaceholder.typicode.com/posts")
    //   .then((response) => response.json())
    //   .then((json) => setApiResponse(json))
    //   .catch((error) => console.log(error))
    //   .finally(() => handelShowResponse());

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


    const prompt = "Analiza la imagen proporcionada. Si contiene una planta, proporciona un resumen breve de su estado general, incluyendo cualquier signo de salud o enfermedad que observes. Si no contiene una planta, indica que no puedes proporcionar información.";
    
    const result = await model.generateContent([prompt, data]);
    setApiResponse(result.response.text());
    handelShowResponse();
    console.log(result.response.text());
  };
  const handelShowResponse = () => {
    setIsLoading(false);
    setShowResponse(true);
  };
  const handleHideResponse = () => {
    setShowResponse(false);
    cancelPreview();
  };

  return (
    <View style={styles.container}>
      {showResponse && (
        <View style={styles.apiResponseModal}>
          <View style={styles.apiResponseContainer}>
            <ScrollView>
              <Text style={styles.responseText}>{apiResponse}</Text>
            </ScrollView>
            <Button title={"Aceptar"} onPress={handleHideResponse} />
          </View>
        </View>
      )}

{isFirstOpen && (
  <Modal
    transparent={true}
    animationType="slide"
    visible={isFirstOpen}
    onRequestClose={closeIntroModal}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.introModal}>
        <ScrollView>
          <Text style={styles.introText}>
            Bienvenido/a a la aplicación de análisis de plantas. Usa esta app
            para capturar imágenes de plantas y obtener un análisis rápido de
            su estado general. Presiona "Cerrar" para continuar.
          </Text>
        </ScrollView>
        <Button title="Cerrar" onPress={closeIntroModal} />
      </View>
    </View>
  </Modal>
)}

      <View style={styles.camera}>
        <Camera
          style={styles.camera}
          type={type}
          flashMode={flash}
          ref={cameraRef}
        />
      </View>
      {isLoading && (
        <View style={styles.indicatorContainer}>
          <ActivityIndicator size={"large"} color={"#0db7ed"} />
          <Text style={styles.indicatorText}>Cargando datos</Text>
        </View>
      )}
      <View style={styles.buttonContainer}>
        <View style={styles.mainButtons}>
          <Button
            title={"Cambiar cámara"}
            icon={"cycle"}
            onPress={toggleCameraType}
          />
          {isPreview && (
            <Button
              title={"Cancelar"}
              icon={"circle-with-cross"}
              onPress={cancelPreview}
            />
          )}

          {!isPreview && (
            <Button title={"Capturar"} icon={"camera"} onPress={takePicture} />
          )}
        </View>
        {isPreview && (
          <Button
            style={styles.sendButton}
            title={"Enviar"}
            icon={"paper-plane"}
            onPress={runModel}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A8D5BA", // Verde suave, inspirado en la naturaleza
    padding: 20, // Espacio adicional
  },
  camera: {
    height: 400,
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderColor: "#4caf50", // Color de borde verde para destacar la cámara
    borderWidth: 4,
  },
  buttonContainer: {
    height: 150,
    width: "90%",
    flexDirection: "column",
    justifyContent: "space-between",
    marginTop: 20,
  },
  mainButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  indicatorContainer: {
    padding: 20,
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    marginTop: 200,
  },
  indicatorText: {
    color: "#ffffff",
    fontSize: 18,
    marginTop: 15,
  },
  apiResponseModal: {
    position: "absolute",
    zIndex: 4,
    height: "90%",
    width: "95%",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Fondo translúcido
    justifyContent: "center",
    borderRadius: 20,
  },
  apiResponseContainer: {
    backgroundColor: "#2d2d3f",
    borderRadius: 15,
    borderColor: "#4caf50",
    borderWidth: 2,
    padding: 15,
  },
  responseText: {
    color: "#e0e0e0",
    fontSize: 18,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  introModal: {
    width: "80%",
    backgroundColor: "#2d2d3f",
    borderRadius: 15,
    padding: 20,
    borderColor: "#4caf50",
    borderWidth: 2,
  },
  introText: {
    color: "#e0e0e0",
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2d2d3f", // Fondo oscuro similar al de la app
    padding: 20,
    borderRadius: 10, // Opcional: Añadir bordes redondeados
  },
  permissionText: {
    textAlign: "center",
    fontSize: 18,
    color: "#ffffff", // Texto blanco para destacarse sobre fondo oscuro
    marginBottom: 15,
  },
  permissionButton: {
    backgroundColor: "#4caf50", // Botón verde, para resaltar
    padding: 10,
    borderRadius: 5,
    marginTop: 10, // Opcional: espaciado entre el texto y el botón
  },
  
  
  
  
});