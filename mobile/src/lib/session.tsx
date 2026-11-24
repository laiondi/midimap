import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import type {Session} from '@supabase/supabase-js';
import {Community,emptyFilters,Filters,messageOf,rpc,supabase} from './api';

type Value={session:Session|null;community:Community|null;ready:boolean;error:string;refresh:()=>Promise<void>;filters:Filters;setFilters:React.Dispatch<React.SetStateAction<Filters>>};
const Context=createContext<Value|null>(null);
export function SessionProvider({children}:{children:React.ReactNode}) {
  const [session,setSession]=useState<Session|null>(null),[community,setCommunity]=useState<Community|null>(null),[ready,setReady]=useState(!supabase),[error,setError]=useState(''),[filters,setFilters]=useState(emptyFilters);
  const epoch=useRef(0),user=useRef<string|null>(null);
  const refresh=useCallback(async()=>{
    if(!supabase)return;
    const request=++epoch.current;
    try {
      const {data,error:e}=await supabase.auth.getSession();if(e)throw e;
      if(request!==epoch.current)return;
      const id=data.session?.user.id || null;
      if(user.current!==id){user.current=id;setCommunity(null);setFilters(emptyFilters);}
      setSession(data.session);
      const c=data.session?await rpc<Community>('contexto_comunidad'):null;
      if(request!==epoch.current)return;
      setCommunity(c);setError('');
    } catch(e) {if(request===epoch.current)setError(messageOf(e));}
    finally {if(request===epoch.current)setReady(true);}
  },[]);
  const invalidate=useCallback(()=>{epoch.current++;},[]);
  useEffect(()=>{
    const initial=setTimeout(()=>{void refresh();},0);
    const auth=supabase?.auth.onAuthStateChange((_event,s)=>{
      if(!s){epoch.current++;user.current=null;setSession(null);setCommunity(null);setFilters(emptyFilters);}
      setTimeout(()=>{void refresh();},0);
    });
    const app=AppState.addEventListener('change',state=>{if(state==='active'){supabase?.auth.startAutoRefresh();void refresh();}else supabase?.auth.stopAutoRefresh();});
    return()=>{clearTimeout(initial);invalidate();auth?.data.subscription.unsubscribe();app.remove();supabase?.auth.stopAutoRefresh();};
  },[refresh,invalidate]);
  return <Context.Provider value={{session,community,ready,error,refresh,filters,setFilters}}>{children}</Context.Provider>;
}
export function useSession(){const value=useContext(Context);if(!value)throw new Error('Falta SessionProvider');return value;}
