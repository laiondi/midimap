import {Stack} from 'expo-router';
import {Platform,Text} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SessionProvider} from '../lib/session';
export default function Layout(){
  if(Platform.OS==='web')return <Text>MiDi Conecta está disponible como app para teléfonos Android e iPhone.</Text>;
  return <SafeAreaProvider><SessionProvider><StatusBar style="dark"/><Stack screenOptions={{headerShown:false}}><Stack.Screen name="(tabs)"/><Stack.Screen name="acceso"/><Stack.Screen name="filtros" options={{presentation:'modal'}}/><Stack.Screen name="reportar" options={{presentation:'modal'}}/></Stack></SessionProvider></SafeAreaProvider>;
}
