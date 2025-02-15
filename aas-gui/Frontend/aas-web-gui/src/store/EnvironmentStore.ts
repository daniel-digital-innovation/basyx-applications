import { defineStore } from 'pinia';

export const useEnvStore = defineStore({
    id: 'envStore',
    state: () => ({
        registryPath: import.meta.env.VITE_REGISTRY_PATH as string,
        aasRepoPath: import.meta.env.VITE_AAS_REPO_PATH as string,
        submodelRepoPath: import.meta.env.VITE_SUBMODEL_REPO_PATH as string,
        conceptDescriptionRepoPath: import.meta.env.VITE_CD_REPO_PATH as string,
        primaryColor: import.meta.env.VITE_PRIMARY_COLOR as string,
        basePath: import.meta.env.VITE_BASE_PATH as string,
    }),
    getters: {
        getEnvRegistryPath(state) {
            return state.registryPath;
        },
        getEnvAASRepoPath(state) {
            return state.aasRepoPath;
        },
        getEnvSubmodelRepoPath(state) {
            return state.submodelRepoPath;
        },
        getEnvConceptDescriptionRepoPath(state) {
            return state.conceptDescriptionRepoPath;
        },
        getEnvPrimaryColor(state) {
            return state.primaryColor;
        },
        getEnvBasePath(state) {
            return state.basePath;
        },
    },
    actions: {},
});
