<template>
  <v-app>
    <!-- App Navigation and it's sub-Components (AASList, etc.) -->
    <AppNavigation />
    <v-main style="padding-top: 33px">
      <!-- App Content (eg. MainWindow, etc.) -->
      <router-view v-slot="{ Component }">
        <keep-alive :include="['AASList', 'AASTreeview', 'SubmodelElementView', 'ComponentVisualization']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useNavigationStore } from '@/store/NavigationStore';
import { useAASStore } from '@/store/AASDataStore';
import RequestHandling from './mixins/RequestHandling';
import SubmodelElementHandling from '@/mixins/SubmodelElementHandling';

import AppNavigation from './components/AppNavigation/AppNavigation.vue';

interface AASType {
  endpoints: Array<{
    protocolInformation: {
      href: string;
    };
  }>;
}

export default defineComponent({
  name: 'App',
  components: {
    RequestHandling, // Mixin to handle the requests to the AAS
    SubmodelElementHandling, // Mixin to handle the SubmodelElements

    AppNavigation,
  },
  mixins: [RequestHandling, SubmodelElementHandling],

  setup() {
    const navigationStore = useNavigationStore()
    const aasStore = useAASStore()

    return {
      navigationStore, // NavigationStore Object
      aasStore, // AASStore Object
    }
  },

  mounted() {
    // console.log(this.$vuetify.display.mobile)
    this.navigationStore.dispatchIsMobile(this.$vuetify.display.mobile);
    this.navigationStore.dispatchPlatform(this.$vuetify.display.platform);

    // check if the aas and path Queries are set in the URL and include them in the URL when switching to the mobile view
    const searchParams = new URL(window.location.href).searchParams;
    const aasEndpoint = searchParams.get('aas');
    const submodelElementPath = searchParams.get('path');

    if (aasEndpoint) {
      // console.log('AAS Query is set: ', aasEndpoint);
      let aas = {} as AASType;
      let endpoints = [];
      endpoints.push({ protocolInformation: { href: aasEndpoint } });
      aas.endpoints = endpoints;
      // dispatch the AAS set by the URL to the store
      this.aasStore.dispatchSelectedAAS(aas);
    }

    if (aasEndpoint && submodelElementPath) {
      // console.log('AAS and Path Queries are set: ', submodelElementPath);
      // Request the selected SubmodelElement
      let path = submodelElementPath;
      let context = 'retrieving SubmodelElement';
      let disableMessage = true;
      this.getRequest(path, context, disableMessage).then((response: any) => {
        if (response.success) { // execute if the Request was successful
          response.data.timestamp = this.formatDate(new Date()); // add timestamp to the SubmodelElement Data
          response.data.path = submodelElementPath; // add the path to the SubmodelElement Data
          response.data.isActive = true; // add the isActive Property to the SubmodelElement Data
          // console.log('SubmodelElement Data: ', response.data)
          // dispatch the SubmodelElementPath set by the URL to the store
          this.aasStore.dispatchNode(response.data); // set the updatedNode in the AASStore
        } else { // execute if the Request failed
          if (Object.keys(response.data).length == 0) {
            // don't copy the static SubmodelElement Data if no Node is selected or Node is invalid
            this.navigationStore.dispatchSnackbar({ status: true, timeout: 60000, color: 'error', btnColor: 'buttonText', text: 'No valid SubmodelElement under the given Path' }); // Show Error Snackbar
            return;
          }
          this.aasStore.dispatchNode({});
        }
      });
    }

    // check which platform is used and change the fitting view
    if (this.$vuetify.display.platform.android || this.$vuetify.display.platform.ios) { // change to AASList when the platform is android or ios
      if(aasEndpoint && submodelElementPath) this.$router.push({ path: '/aaslist', query: { aas: aasEndpoint, path: submodelElementPath } });
      else if(aasEndpoint && !submodelElementPath) this.$router.push({ path: '/aaslist', query: { aas: aasEndpoint } });
      else this.$router.push({ path: '/aaslist' });
    } else { // change to MainWindow when the platform is not android or ios
      if(aasEndpoint && submodelElementPath) this.$router.push({ name: 'MainWindow', query: { aas: aasEndpoint, path: submodelElementPath } });
      else if(aasEndpoint && !submodelElementPath) this.$router.push({ name: 'MainWindow', query: { aas: aasEndpoint } });
      else this.$router.push({ name: 'MainWindow' });
    }
  }
});
</script>

<style>
@import '../node_modules/@fontsource/roboto/index.css';
html { overflow-y: auto };
</style>
