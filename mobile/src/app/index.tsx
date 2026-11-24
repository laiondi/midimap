import {Redirect} from 'expo-router';import {Loading} from '../components/ui';import {useSession} from '../lib/session';
export default function Index(){const {ready,session}=useSession();return !ready?<Loading/>:<Redirect href={session?'/descubrir':'/acceso'}/>;}
