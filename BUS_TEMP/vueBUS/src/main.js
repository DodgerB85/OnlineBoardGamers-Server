//import './assets/main.css'

//import { createApp } from 'vue'
import { /*ref, onMounted,*/ createApp } from 'vue';
import { createPinia } from 'pinia'
import App from './App.vue'

var app = createApp(App)


app.use(createPinia())

app.mount('#app')

/************************************************************************************* */
/*import { ref, nextTick } from 'vue';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';


// Function to initialize the Vue app instance
const initializeVueApp = () => {
  const app2 = createApp(App);
  app2.use(createPinia());
  return app2;
};

var  app = ref(initializeVueApp());

// Create a ref to hold the app instance
//const app = ref(initializeVueApp());

// Function to mount the app
const mountApp = () => {
  app.value.mount('#app');
};

// Function to unmount the app
const unmountApp = () => {
  app.value.unmount();
  app.value = null;
};

// Mount the app immediately
nextTick(() => {
  mountApp();
});

// Remount the app after a timeout
//setTimeout(() => {
export  const unmountBUS = () => {
//function doStuff()  {
  const appElement = document.getElementById('app');
  if (appElement) {
    alert(2)
   // unmountApp(); // Unmount the app
    //appElement.innerHTML = ''; // Clear the inner HTML

    // Mount the app again after clearing
    appElement.innerHTML = ''; // Clear the custom HTML after a delay
    app.value = initializeVueApp(); // Create a new app instance
    mountApp();
   
  }
}
//  , 13000); // Change this delay as needed


 // setTimeout(() => {
  export  const remountBUS = () => {

    //function doStuff()  {
    const appElement = document.getElementById('app');
    if (appElement) {
      alert(1)
      let innerH = appElement.innerHTML;
      unmountApp(); // Unmount the app
      //document.innerHTML = innerH
      appElement.innerHTML = '<p>App is unmounted. Display custom HTML here.</p>'; // Display custom HTML
      appElement.innerHTML = innerH; // Display custom HTML
       
      //appElement.innerHTML = appElement.innerHTML; // Clear the inner HTML
  
      // Mount the app again after clearing
      //app.value = initializeVueApp(); // Create a new app instance
      //mountApp();
      
    }
  }
  //  , 3000); // Change this delay as needed
*/

/*
import { createApp, onMounted } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

let initializedApp = null;

// Function to initialize the Vue app instance
export const initializeVueApp = () => {
  initializedApp = createApp(App);
  initializedApp.use(createPinia());
  return initializedApp;
};

// Function to mount the app
export const mountApp = () => {
  const appElement = document.getElementById('app');
  if (initializedApp && appElement) {
    initializedApp.mount(appElement);
  }
};

// Function to unmount the app
export const unmountApp = () => {
  if (initializedApp) {
    initializedApp.unmount();
  }
};

// Function to display custom HTML
export const displayCustomHTML = () => {
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.innerHTML = '<p>App is unmounted. Display custom HTML here.</p>';
  }
};

// Function to remount the app
export const remountApp = () => {
  const appElement = document.getElementById('app');
  if (appElement) {
    appElement.innerHTML = '';
    mountApp();
  }
};

onMounted(() => {
  mountApp();
});
*/