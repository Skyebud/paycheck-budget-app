import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDDDHodA4jp04x_5mX_FWv6apufhECmcek",
  authDomain: "paycheck-budget-app-bca43.firebaseapp.com",
  projectId: "paycheck-budget-app-bca43",
  storageBucket: "paycheck-budget-app-bca43.firebasestorage.app",
  messagingSenderId: "481666020224",
  appId: "1:481666020224:web:f52a2dc8ea98f912194765",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
