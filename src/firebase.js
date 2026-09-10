import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// import serviceAccount from "./cloud/art-judge-5c75c-firebase-adminsdk-fbsvc-a243e8f542.json";
import { webConfig } from "./firebaseWebConfig";

const firebaseConfig = {
  apiKey: webConfig.apiKey,
  // authDomain: webConfig.authDomain || `${serviceAccount.project_id}.firebaseapp.com`,
  authDomain: webConfig.authDomain,
  projectId: serviceAccount.project_id,
  // storageBucket: webConfig.storageBucket || `${serviceAccount.project_id}.appspot.com`,
  storageBucket: webConfig.storageBucket,
  messagingSenderId: webConfig.messagingSenderId || "",
  appId: webConfig.appId || "",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;