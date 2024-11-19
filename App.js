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
  // Contenedor principal
  container: {
    flex: 1,
    alignItems: "center", // Alineación centrada horizontal
    justifyContent: "center", // Alineación centrada vertical
    backgroundColor: "#A8D5BA", // Verde suave, inspirado en la naturaleza
    padding: 20, // Espacio adicional alrededor del contenido
  },

  // Estilo de la cámara
  camera: {
    height: 400, // Altura de la cámara
    width: "100%", // Ancho completo
    borderRadius: 20, // Bordes redondeados
    overflow: "hidden", // Para asegurar que el contenido se recorte si se sale del borde
    borderColor: "#4caf50", // Color de borde verde para destacar la cámara
    borderWidth: 4, // Grosor del borde
  },

  // Contenedor de botones
  buttonContainer: {
    height: 150, // Altura del contenedor
    width: "90%", // Ancho del contenedor
    flexDirection: "column", // Dirección de los botones (vertical)
    justifyContent: "space-between", // Espaciado entre los botones
    marginTop: 20, // Espacio superior
  },

  // Contenedor de botones principales
  mainButtons: {
    flexDirection: "row", // Disposición horizontal de los botones
    justifyContent: "space-around", // Espaciado equitativo entre los botones
  },

  // Contenedor del indicador de carga
  indicatorContainer: {
    padding: 20, // Espaciado alrededor del indicador
    position: "absolute", // Posición absoluta para que se superponga a la UI
    justifyContent: "center", // Centrado del contenido
    alignItems: "center", // Centrado de los íconos/texto
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fondo translúcido negro
    borderRadius: 20, // Bordes redondeados
    marginTop: 200, // Margen superior para colocarlo en el centro de la pantalla
  },

  // Estilo del texto en el indicador de carga
  indicatorText: {
    color: "#ffffff", // Texto blanco
    fontSize: 18, // Tamaño del texto
    marginTop: 15, // Espacio superior entre el indicador y el texto
  },

  // Estilos para el modal de respuesta de la IA
  apiResponseModal: {
    position: "absolute", // Posición absoluta para que se superponga a la UI
    zIndex: 4, // Prioridad de apilamiento
    height: "90%", // Altura del modal (90% de la pantalla)
    width: "95%", // Ancho del modal (95% de la pantalla)
    padding: 20, // Espaciado interior
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Fondo translúcido para el modal
    justifyContent: "center", // Alineación centrada del contenido dentro del modal
    borderRadius: 20, // Bordes redondeados
  },

  // Estilo del contenedor de la respuesta de la IA
  apiResponseContainer: {
    backgroundColor: "#2d2d3f", // Fondo oscuro para la respuesta
    borderRadius: 15, // Bordes redondeados
    borderColor: "#4caf50", // Borde verde
    borderWidth: 2, // Grosor del borde
    padding: 15, // Espaciado interior
  },

  // Estilo del texto de la respuesta
  responseText: {
    color: "#e0e0e0", // Color gris claro para el texto
    fontSize: 18, // Tamaño del texto
  },

  // Estilo de la superposición del modal introductorio
  modalOverlay: {
    flex: 1, // Toma toda la pantalla
    justifyContent: "center", // Centrado vertical
    alignItems: "center", // Centrado horizontal
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fondo translúcido
  },

  // Estilo del modal introductorio
  introModal: {
    width: "80%", // Ancho del modal
    backgroundColor: "#2d2d3f", // Fondo oscuro
    borderRadius: 15, // Bordes redondeados
    padding: 20, // Espaciado interior
    borderColor: "#4caf50", // Borde verde
    borderWidth: 2, // Grosor del borde
  },

  // Estilo del texto introductorio
  introText: {
    color: "#e0e0e0", // Color gris claro para el texto
    fontSize: 16, // Tamaño del texto
    marginBottom: 15, // Espacio inferior
    textAlign: "center", // Alineación centrada
  },

  // Contenedor para la solicitud de permisos
  permissionContainer: {
    flex: 1, // Toma toda la pantalla
    justifyContent: "center", // Centrado vertical
    alignItems: "center", // Centrado horizontal
    backgroundColor: "#2d2d3f", // Fondo oscuro similar al de la app
    padding: 20, // Espaciado interior
    borderRadius: 10, // Bordes redondeados opcionales
  },

  // Estilo del texto de permisos
  permissionText: {
    textAlign: "center", // Alineación centrada
    fontSize: 18, // Tamaño del texto
    color: "#ffffff", // Texto blanco para destacarse sobre fondo oscuro
    marginBottom: 15, // Espacio inferior
  },

  // Estilo del botón de permisos
  permissionButton: {
    backgroundColor: "#4caf50", // Botón verde para resaltar
    padding: 10, // Espaciado interno
    borderRadius: 5, // Bordes redondeados
    marginTop: 10, // Espacio superior
  },
});
