<template>
    <v-container fluid class="pa-0">
        <v-card color="rgba(0,0,0,0)" elevation="0">
            <v-card-title style="padding: 15px 16px 16px">
                <!-- TODO: Add Searchfield to filter the Treeview -->
                AAS Treeview
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text style="overflow-y: auto; height: calc(100vh - 170px)">
                <!-- Spinner for loading State -->
                <v-row v-if="loading" justify="center" class="ma-3">
                    <v-col cols="auto">
                        <v-progress-circular :size="70" :width="7" indeterminate></v-progress-circular>
                    </v-col>
                </v-row>
                <!-- TODO: Replace with Vuetify Treeview Component when it get's released in Q1 2023 -->
                <VTreeview v-else v-for="item in submodelData" :key="item.id" class="root" :item="item" :depth="0"></VTreeview>
            </v-card-text>
        </v-card>
    </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useNavigationStore } from '@/store/NavigationStore';
import { useAASStore } from '@/store/AASDataStore';
import { useEnvStore } from '@/store/EnvironmentStore';
import RequestHandling from '../mixins/RequestHandling';
import SubmodelElementHandling from '../mixins/SubmodelElementHandling';

import VTreeview from './UIComponents/VTreeview.vue';

export default defineComponent({
    name: 'AASTreeview',
    components: {
        RequestHandling, // Mixin to handle the requests to the AAS

        VTreeview,
    },
    mixins: [RequestHandling, SubmodelElementHandling],

    setup () {
        const navigationStore = useNavigationStore()
        const aasStore = useAASStore()
        const envStore = useEnvStore()

        return {
            navigationStore, // NavigationStore Object
            aasStore, // AASStore Object
            envStore, // EnvironmentStore Object
        }
    },

    data() {
        return {
            submodelData: [] as Array<any>, // Treeview Data
            initialUpdate: false, // Flag to check if the initial update of the Treeview is needed and/or done
            initialNode: {} as any, // Initial Node to set the Treeview to
            // SMPath: '', // Path of the selected SubmodelElement (used for the initial load of the Treeview when the app is started with a path Query)
        }
    },

    mounted() {
        this.initTreeWithRouteParams();
    },

    watch: {
        // initialize Treeview when AAS gets selected or changes
        SelectedAAS: {
            deep: true,
            handler() {
                this.initializeTree();
            }
        },

        // Resets the Treeview when the Registry Server changes
        registryServerURL() {
            if(!this.registryServerURL) {
                this.submodelData = [];
            }
        },

        // change the submodelData Object when the updated Node changes
        updatedNode() {
            this.updateNode(this.updatedNode);
        },

        // initialize Treeview when the initTree flag changes
        initTree() {
            if(this.initTree) {
                this.initTreeWithRouteParams();
                this.aasStore.dispatchInitTreeByReferenceElement(false); // reset the initTree flag
            }
        },
    },


    computed: {
        // get selected AAS from Store
        SelectedAAS() {
            return this.aasStore.getSelectedAAS;
        },

        // gets loading State from Store
        loading() {
            return this.aasStore.getLoadingState;
        },

        // get Registry Server URL from Store
        registryServerURL() {
            return this.navigationStore.getRegistryURL;
        },

        // Get the Env Variable for the Submodel Repo URL from the store
        EnvSubmodelRepoPath() {
            return this.envStore.getEnvSubmodelRepoPath;
        },

        // get the updated Treeview Node from Store
        updatedNode() {
            return this.aasStore.getUpdatedNode;
        },
        // get the init treeview flag from Store
        initTree() {
            return this.aasStore.getInitTreeByReferenceElement;
        },
    },

    methods: {
        // Function to get the Submodels from the selected AAS (retrieved from the AAS with the provided endpoint)
        initializeTree() {
            // console.log('Initialize Treeview', this.initialUpdate, this.initialNode);
            // return if no endpoints are available
            if(!this.SelectedAAS || !this.SelectedAAS.endpoints || this.SelectedAAS.endpoints.length === 0 || !this.SelectedAAS.endpoints[0].protocolInformation || !this.SelectedAAS.endpoints[0].protocolInformation.href) {
                // TODO: this seems to get executed on reload with a selected AAS
                this.navigationStore.dispatchSnackbar({ status: true, timeout: 4000, color: 'error', btnColor: 'buttonText', text: 'AAS with no (valid) Endpoint selected!' });
                return;
            }
            if(this.loading) return; // return if loading state is true -> prevents multiple requests
            this.aasStore.dispatchLoadingState(true); // set loading state to true
            this.submodelData = []; // reset Treeview Data
            // retrieve AAS from endpoint
            let path = this.SelectedAAS.endpoints[0].protocolInformation.href + '/submodel-refs';
            let context = 'retrieving Submodel References';
            let disableMessage = false;
            this.getRequest(path, context, disableMessage).then(async (response: any) => {
                this.aasStore.dispatchLoadingState(false); // set loading state to false
                if (response.success) { // execute if the Request was successful
                    try {
                        // request submodels from the retrieved AAS (top layer of the Treeview)
                        let submodelData = await this.requestSubmodels(response.data.result);
                        // set the isActive prop of the initialNode if it exists and the initialUpdate flag is set
                        if(this.initialUpdate && this.initialNode) {
                            let expandedSubmodelData = this.expandTree(submodelData, this.initialNode); // Update the Treeview to expand until the initially set node is reached
                            // this.updateNode(this.initialNode); // set the isActive prop of the initialNode to true
                            this.initialUpdate = false;
                            this.initialNode = {};
                            // console.log('Expanded Treeview Data: ', expandedSubmodelData)
                            this.submodelData = expandedSubmodelData; // set the Treeview Data
                        } else {
                            this.submodelData = submodelData; // set the Treeview Data
                            // console.log('Treeview Data: ', this.submodelData)
                        }
                    } catch (error: any) {
                        // console.error('Error while parsing the Submodel References: ', error);
                        const errorMessage = error.message;
                        const errorStack = error.stack;
                        const errorLocation = errorStack ? errorStack.split('\n')[1] : '';
                        this.navigationStore.dispatchSnackbar({ status: true, timeout: 60000, color: 'error', btnColor: 'buttonText', baseError: 'Error while parsing the Submodel References!', extendedError: `Error: ${errorMessage}\nLocation: ${errorLocation.trim()}` });
                    }
                } else { // execute if the Request failed
                    this.submodelData = [];
                }
            });
        },

        // Function to request all Submodels from the selected AAS
        async requestSubmodels(submodelRefs: any) {
            // console.log('SubmodelRefs: ', submodelRefs);
            let submodelPromises = submodelRefs.map((submodelRef: any) => {
                // extract the submodelRepoURL from the Environment Variables or the Browsers LocalStorage
                let submodelRepoURL = '';
                if (this.EnvSubmodelRepoPath && this.EnvSubmodelRepoPath != '') {
                    submodelRepoURL = this.EnvSubmodelRepoPath;
                }
                let submodelRepoURLFromLocalStorage = window.localStorage.getItem('SubmodelRepoURL');
                if (submodelRepoURLFromLocalStorage && submodelRepoURLFromLocalStorage != '') {
                    submodelRepoURL = submodelRepoURLFromLocalStorage;
                }
                if (!submodelRepoURL || submodelRepoURL == '') {
                    this.navigationStore.dispatchSnackbar({ status: true, timeout: 4000, color: 'error', btnColor: 'buttonText', text: 'Submodel URL can not be resolved!' });
                    return;
                }
                // retrieve Submodel from endpoint
                let path = submodelRepoURL + '/' + this.URLEncode(submodelRef.keys[0].value); // use the Submodel Repository URL if it is set, otherwise use the SMEPath (from the path Query)
                let context = 'retrieving Submodel Data';
                let disableMessage = true;
                return this.getRequest(path, context, disableMessage).then((response: any) => {
                    if (response.success) { // execute if the Request was successful
                        let submodel = response.data;
                        // give the Submodel a unique ID
                        submodel.id = this.UUID();
                        // set the active State of the Submodel
                        submodel.isActive = false;
                        // set the Path of the Submodel
                        submodel.path = path;
                        // check if submodel has SubmodelElements
                        if(submodel.submodelElements || submodel.submodelElements.length > 0) {
                            // recursively create treestructure for contained submodelElements
                            let submodelElements = this.prepareTreeviewData(submodel.submodelElements, submodel);
                            // add the SubmodelElements to the Submodel
                            submodel.children = submodelElements;
                            // set showChildren to false (for the Treeview Component)
                            submodel.showChildren = false;
                        }
                        return submodel;
                    }
                });
            });
            let submodels = await Promise.all(submodelPromises);
            return submodels;
        },

        // Function to prepare the Datastructure for the Treeview
        prepareTreeviewData(SubmodelElements: any, parent: any) {
            // console.log('SubmodeElements: ', SubmodelElements);
            // iterate over all elements in the current level of the tree (SubmodelElements [e.g. SubmodelElementCollections, SubmodelElementLists, Entities, Properties, ...])
            SubmodelElements.forEach((element: any, index: number) => {
                // give the Element a unique ID
                element.id = this.UUID();
                // set the active State of each Element
                element.isActive = false;
                // set the Parent of each Element
                element.parent = parent;
                // set the Path of each Element
                if(element.parent.modelType == 'Submodel') {
                    element.path = element.parent.path + '/submodel-elements/' + element.idShort;
                } else if(element.parent.modelType == 'SubmodelElementList') {
                    element.path = element.parent.path + encodeURIComponent('[') + index + encodeURIComponent(']');
                } else {
                    element.path = element.parent.path + '.' + element.idShort;
                }
                // check if the Element has Children
                if(element.submodelElements && element.submodelElements.length > 0) { // check for SubmodelElements
                    // if the Element has Children, call the Function again with the Children as Data
                    element.children = this.prepareTreeviewData(element.submodelElements, element);
                    element.showChildren = false; // set showChildren to false (for the Treeview Component)
                } else if(element.value && Array.isArray(element.value) && element.value.length > 0 && (element.modelType == 'SubmodelElementCollection' || element.modelType == 'SubmodelElementList')) { // check for Values (SubmodelElementCollections or SubmodelElementLists)
                    // if the Element has Children, call the Function again with the Children as Data
                    element.children = this.prepareTreeviewData(element.value, element);
                    element.showChildren = false; // set showChildren to false (for the Treeview Component)
                } else if(element.statements && Array.isArray(element.statements) && element.statements.length > 0 && element.modelType == 'Entity') { // check for Statements (Entities)
                    // if the Element has Children, call the Function again with the Children as Data
                    element.children = this.prepareTreeviewData(element.statements, element);
                    element.showChildren = false; // set showChildren to false (for the Treeview Component

                }
            });
            return SubmodelElements;
        },

        // Function to select a Property
        updateNode(updatedNode: any) {
            // console.log('Updated Node: ', updatedNode);
            // change the isActive State of the selected Node in the Treeview Data (submodelData)
            this.submodelData = this.changeActiveState(this.submodelData, updatedNode);
        },

        // Function to change the isActive State of a Node in the Treeview Data (submodelData)
        changeActiveState(data: any, updatedNode: any) {
            // iterate over all elements in the current level of the tree (Submodels, SubmodelElements [e.g. SubmodelElementCollections, Properties])
            data.forEach((element: any) => {
                // check if the Element has Children
                if(element.children && element.children.length > 0) { // check for SubmodelElements
                    // if the Element has Children, call the Function again with the Children as Data
                    element.children = this.changeActiveState(element.children, updatedNode);
                }
                // check if the Element is the updated Node
                if (element.path === updatedNode.path) {
                    // set isActive State of the updated node
                    element.isActive = updatedNode.isActive;
                } else {
                    // set isActive State of all other nodes to false
                    element.isActive = false;
                }
            });
            return data;
        },

        // Function to expand the Treeview until the selected Node is visible
        expandTree(submodelData: any, updatedNode: any) {
            // console.log('Updated Node: ', updatedNode);
            // iterate over submodelData to find the updated Node
            let expandedSubmodelData = this.findNodeByPath(submodelData, updatedNode.path);
            // console.log('Treeview Data: ', expandedSubmodelData);
            return expandedSubmodelData;
        },

        // Function to find a Node in the Treeview Data (submodelData) by its path
        findNodeByPath(data: any, path: string) {
            // iterate over all elements in the current level of the tree (Submodels, SubmodelElements [e.g. SubmodelElementCollections, Properties])
            let foundNode = false;
            data.forEach((element: any) => {
                // check if the Element is the updated Node
                if (element.path == path) { // if node is found, recurse up the tree to set showChildren to true
                    // console.log('Found Node: ', element);
                    // set isActive State of the updated node
                    if (!foundNode) {
                        foundNode = true;
                        element.isActive = true;
                    }
                    // if prop showChildren exists, set it to true
                    if('showChildren' in element) {
                        element.showChildren = true;
                    }
                    // set showChildren of the parent of the updated node to true, if a parent exists
                    if(element.parent) {
                        element.parent = this.updateParent(element.parent);
                    }
                } else { // recurse down the tree until node is found
                    // check if the Element has Children
                    if(element.children && element.children.length > 0) { // check for SubmodelElements
                        // if the Element has Children, call the Function again with the Children as Data
                        this.findNodeByPath(element.children, path);
                    }
                }
            });
            return data;
        },

        // Function to set showChildren of the parent of the updated node to true, if a parent exists
        updateParent(parent: any) {
            // if prop showChildren exists, set it to true
            if('showChildren' in parent) {
                parent.showChildren = true;
            }
            // set showChildren of the parent of the updated node to true, if a parent exists
            if(parent.parent) {
                parent.parent = this.updateParent(parent.parent);
            }
            return parent;
        },

        // Function to initialize the treeview with route params
        initTreeWithRouteParams() {
            // check if the SelectedAAS is already set in the Store and initialize the Treeview if so
            if (this.SelectedAAS && this.SelectedAAS.endpoints && this.SelectedAAS.endpoints[0] && this.SelectedAAS.endpoints[0].protocolInformation && this.SelectedAAS.endpoints[0].protocolInformation.href) {
                // console.log('init Tree from Route Params: ', this.SelectedAAS);
                this.initializeTree();
            }

            // check if the aas Query and the path Query are set in the URL and if so load the Submodel/Submodelelement
            const searchParams = new URL(window.location.href).searchParams;
            const aasEndpoint = searchParams.get('aas');
            const path = searchParams.get('path');

            if (aasEndpoint && path) {
                // console.log('AAS and Path Queris are set: ', aasEndpoint, path);
                let node = {} as any;
                node.path = path;
                node.isActive = true;
                // set the isActive prop of the node in submodelData to true
                this.initialUpdate = true;
                this.initialNode = node;
            }
        },
    },
});
</script>
