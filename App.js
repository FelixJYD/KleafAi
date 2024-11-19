// Importación de dependencias
import { Camera, CameraType } from "expo-camera";
import { useRef, useState, useEffect } from "react";
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

// Componente principal de la aplicación
export default function App() {
  // Estado de permisos y configuración de la cámara
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [isPreview, setIsPreview] = useState(false);
  const [type, setType] = useState(CameraType.back);
  const [flash, setFlash] = useState(Camera.flash);
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [apiResponse, setApiResponse] = useState("");
  const [isFirstOpen, setIsFirstOpen] = useState(true); // Estado para el modal introductorio

  // Referencias a la cámara e imagen
  const cameraRef = useRef(null);
  const imageRef = useRef(null);

  // Instancia de la API generativa de Google
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_API_KEY);

  // UseEffect para mostrar el modal solo la primera vez
  useEffect(() => {
    if (isFirstOpen) {
      setIsFirstOpen(true);
    }
  }, []);

  // Función para cerrar el modal introductorio
  const closeIntroModal = () => {
    setIsFirstOpen(false);
  };

  // Comprobación de permisos
  if (!permission) {
    return <View />; // Esperando permisos de la cámara
  }

  if (!permission.granted) {
    // Si no se tienen permisos de cámara
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

  // Función para alternar entre cámara frontal y trasera
  const toggleCameraType = () => {
    setType((current) =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
    cancelPreview();
  };

  // Función para capturar la imagen
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

  // Función para cancelar la vista previa
  const cancelPreview = async () => {
    await cameraRef.current.resumePreview();
    setIsPreview(false);
  };

  // Función para ejecutar el modelo de IA
  const runModel = async () => {
    setIsLoading(true);

    const data = {
      inlineData: {
        data: imageRef.current.base64,
        mimeType: "image/png",
      },
    };

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Analiza la imagen proporcionada. Si contiene una planta, proporciona un resumen breve de su estado general, incluyendo cualquier signo de salud o enfermedad que observes. Si no contiene una planta, indica que no puedes proporcionar información.";
    
    const result = await model.generateContent([prompt, data]);
    setApiResponse(result.response.text());
    handelShowResponse();
    console.log(result.response.text());
  };

  // Función para mostrar la respuesta de la IA
  const handelShowResponse = () => {
    setIsLoading(false);
    setShowResponse(true);
  };

  // Función para ocultar la respuesta
  const handleHideResponse = () => {
    setShowResponse(false);
    cancelPreview();
  };

  // Renderizado de la UI
  return (
    <View style={styles.container}>
      
      {/* Modal de respuesta de la IA */}
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

      {/* Modal introductorio */}
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

      {/* Vista de la cámara */}
      <View style={styles.camera}>
        <Camera
          style={styles.camera}
          type={type}
          flashMode={flash}
          ref={cameraRef}
        />
      </View>

      {/* Indicador de carga */}
      {isLoading && (
        <View style={styles.indicatorContainer}>
          <ActivityIndicator size={"large"} color={"#0db7ed"} />
          <Text style={styles.indicatorText}>Cargando datos</Text>
        </View>
      )}

      {/* Contenedor de botones */}
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

        {/* Botón para enviar la imagen */}
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

// Definición de estilos para la aplicación
const styles = StyleSheet.create({
  // Contenedor principal con temática de naturaleza
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#edf4e8", // Fondo verde claro inspirado en plantas
    padding: 20,
  },

  // Estilo de la cámara con borde temático
  camera: {
    height: 400,
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderColor: "#81c784", // Verde natural para resaltar
    borderWidth: 4,
    backgroundColor: "#ffffff", // Fondo blanco como placeholder para la cámara
  },

  // Contenedor de botones
  buttonContainer: {
    height: 150,
    width: "90%",
    flexDirection: "column",
    justifyContent: "space-between",
    marginTop: 20,
    backgroundColor: "#ffffff", // Fondo blanco para destacar los botones
    borderRadius: 15, // Bordes suaves
    padding: 10,
    shadowColor: "#000", // Sombra para dar profundidad
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, // Sombra en Android
  },

  // Contenedor de botones principales (Cambiar cámara, Capturar)
  mainButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  // Contenedor del indicador de carga
  indicatorContainer: {
    padding: 20,
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fondo translúcido oscuro
    borderRadius: 20,
    marginTop: 200,
  },

  // Texto en el indicador de carga
  indicatorText: {
    color: "#ffffff",
    fontSize: 18,
    marginTop: 15,
  },

  // Estilo del modal de respuesta de la IA
  apiResponseModal: {
    position: "absolute",
    zIndex: 4,
    height: "90%",
    width: "95%",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Fondo translúcido oscuro
    justifyContent: "center",
    borderRadius: 20,
  },

  // Contenedor del texto de respuesta
  apiResponseContainer: {
    backgroundColor: "#dcedc8", // Verde claro para texto
    borderRadius: 15,
    borderColor: "#81c784", // Verde vivo para el borde
    borderWidth: 2,
    padding: 15,
  },

  // Texto de respuesta
  responseText: {
    color: "#2e7d32", // Verde oscuro para mejor contraste
    fontSize: 18,
  },

  // Superposición del modal introductorio
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fondo translúcido oscuro
  },

  // Modal introductorio
  introModal: {
    width: "80%",
    backgroundColor: "#ffffff", // Fondo blanco para mejor legibilidad
    borderRadius: 15,
    padding: 20,
    borderColor: "#81c784", // Verde vivo
    borderWidth: 2,
  },

  // Texto introductorio
  introText: {
    color: "#388e3c", // Verde oscuro
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
  },

  // Contenedor de permisos
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f8e9", // Fondo verde pálido
    padding: 20,
    borderRadius: 10,
  },

  // Texto de permisos
  permissionButton: {
    backgroundColor: "#388e3c", // Verde oscuro para mayor contraste
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ffffff", // Borde blanco que resalte
    shadowColor: "#000", // Sombras para darle profundidad
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Para dispositivos Android
},
permissionText: {
    textAlign: "center",
    fontSize: 16,
    color: "#ffffff", // Texto blanco para resaltar
    fontWeight: "bold",
},

});
