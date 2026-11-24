import {useCallback,useEffect,useMemo,useRef,useState} from 'react';import {Animated,PanResponder,ScrollView,Text,View,useWindowDimensions} from 'react-native';import {router} from 'expo-router';
import {messageOf,Profile,rpc} from '../lib/api';import {Button,colors,styles} from './ui';import {categoryLabel,ProfileImage,townLabel,types} from './profile';
export function SwipeCard({profile,onComplete}:{profile:Profile;onComplete:(matched:boolean)=>void}){
  const [point]=useState(()=>new Animated.ValueXY());
  const busyRef=useRef(false),alive=useRef(true);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');const {height,width}=useWindowDimensions();
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const submit=useCallback(async (interest:boolean)=>{
    if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
    try {
      const result=await rpc<{match:boolean}>('deslizar_ficha',{p_destino:profile.id,p_interes:interest});
      if(!alive.current)return;
      Animated.timing(point,{toValue:{x:interest?width:-width,y:20},duration:180,useNativeDriver:true}).start(()=>{if(alive.current)onComplete(result.match);});
    }catch(e){if(alive.current){setError(messageOf(e));Animated.spring(point,{toValue:{x:0,y:0},useNativeDriver:true}).start();busyRef.current=false;setBusy(false);}}
  },[profile.id,width,point,onComplete]);
  // PanResponder registra estos callbacks; los refs se consultan al recibir el gesto.
  // eslint-disable-next-line react-hooks/refs -- PanResponder does not invoke the registered event handlers during render.
  const pan=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_e,g)=>!busy && Math.abs(g.dx)>14 && Math.abs(g.dx)>Math.abs(g.dy)*1.3,
    onPanResponderMove:(_e,g)=>{if(!busy)point.setValue({x:g.dx,y:g.dy*0.15});},
    onPanResponderRelease:(_e,g)=>{if(Math.abs(g.dx)>Math.min(100,width*0.25))void submit(g.dx>0);else Animated.spring(point,{toValue:{x:0,y:0},useNativeDriver:true}).start();},
    onPanResponderTerminate:()=>Animated.spring(point,{toValue:{x:0,y:0},useNativeDriver:true}).start(),
  }),[point,width,submit,busy]);
  return <View style={{gap:14}}><Animated.View {...pan.panHandlers} style={[styles.card,{padding:12,transform:[...point.getTranslateTransform(),{rotate:point.x.interpolate({inputRange:[-width,0,width],outputRange:['-12deg','0deg','12deg']})}]}]}><ProfileImage profile={profile} height={Math.max(150,Math.min(250,height*0.28))}/><ScrollView style={{maxHeight:height*0.27}} contentContainerStyle={{gap:10,padding:8}}><Text style={styles.eyebrow}>{types[profile.tipo_perfil]||'Perfil creativo'}</Text><Text style={styles.title}>{profile.nombre}</Text><Text style={[styles.muted,{fontWeight:'700'}]}>{categoryLabel(profile.categoria)} · {townLabel(profile.localidad)}</Text><Text style={styles.body}>{profile.servicios}</Text><Text style={styles.muted}>{profile.descripcion}</Text></ScrollView></Animated.View><View style={[styles.row,{justifyContent:'center'}]}><Button title={busy?'Guardando…':'Pasar'} secondary disabled={busy} onPress={()=>void submit(false)}/><Button title={busy?'Guardando…':'Me interesa'} disabled={busy} onPress={()=>void submit(true)}/></View><Text style={[styles.muted,{textAlign:'center'}]}>Deslizá a la izquierda para pasar o a la derecha para conectar.</Text>{error?<Text accessibilityRole="alert" style={styles.error}>{error}</Text>:null}<Button title="Reportar o bloquear este perfil" secondary disabled={busy} onPress={()=>router.push({pathname:'/reportar',params:{id:profile.id,nombre:profile.nombre}})}/><View style={{height:2,backgroundColor:colors.line}}/></View>;
}
