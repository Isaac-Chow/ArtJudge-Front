import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import serviceAccount from "/etc/secrets/art-judge-5c75c-firebase-adminsdk-fbsvc-bbb2376617.json";
import { webConfig } from "./firebaseWebConfig";

const firebaseConfig = {
  apiKey: webConfig.apiKey,
  authDomain: webConfig.authDomain || `${serviceAccount.project_id}.firebaseapp.com`,
  // authDomain: webConfig.authDomain,
  projectId: webConfig.project_id,
  storageBucket: webConfig.storageBucket || `${serviceAccount.project_id}.appspot.com`,
  // storageBucket: webConfig.storageBucket,
  messagingSenderId: webConfig.messagingSenderId,
  appId: webConfig.appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;