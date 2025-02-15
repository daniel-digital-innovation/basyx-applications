<template>
    <v-container fluid class="pa-0">
        <v-list-item class="px-1 pb-1 pt-0">
            <v-list-item-title class="text-subtitle-2 mt-2">{{ 'Value: ' }}</v-list-item-title>
        </v-list-item>
        <v-card color="elevatedCard" v-if="propertyObject">
            <!-- Value of the Property -->
            <v-list nav class="bg-elevatedCard pt-0">
                <!-- valueType -->
                <v-list-item class="pb-0">
                    <v-list-item-title>
                        <span class="text-caption">{{ 'Value Type: ' }}</span>
                        <v-chip label size="x-small" border color="primary">{{ propertyObject.valueType }}</v-chip>
                    </v-list-item-title>
                </v-list-item>
                <!-- Value Representation depending on the valueType -->
                <NumberType v-if="isNumber(propertyObject.valueType)" :numberValue="propertyObject" @updateValue="updateValue"></NumberType>
                <BooleanType v-else-if="propertyObject.valueType == 'boolean'" :booleanValue="propertyObject" @updateValue="updateValue"></BooleanType>
                <DateTimeStampType v-else-if="propertyObject.valueType == 'dateTimeStamp'" :dateTimeStampValue="propertyObject" @updateValue="updateValue"></DateTimeStampType>
                <StringType v-else="propertyObject.valueType == 'string'" :stringValue="propertyObject" @updateValue="updateValue"></StringType>
            </v-list>
        </v-card>
    </v-container>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useAASStore } from '@/store/AASDataStore';
import RequestHandling from '../../mixins/RequestHandling';
import SubmodelElementHandling from '@/mixins/SubmodelElementHandling';

import StringType from './ValueTypes/StringType.vue';
import NumberType from './ValueTypes/NumberType.vue';
import BooleanType from './ValueTypes/BooleanType.vue';
import DateTimeStampType from './ValueTypes/DateTimeStampType.vue';

export default defineComponent({
    name: 'Property',
    components: {
        RequestHandling, // Mixin to handle the requests to the AAS
        SubmodelElementHandling, // Mixin to handle the SubmodelElements

        // Value Types
        StringType,
        NumberType,
        BooleanType,
        DateTimeStampType,
    },
    mixins: [RequestHandling, SubmodelElementHandling],
    props: ['propertyObject'],

    setup() {
        const aasStore = useAASStore()

        return {
            aasStore, // AASStore Object
        }
    },

    data() {
        return {
        }
    },

    computed: {
        // get selected AAS from Store
        SelectedAAS() {
            return this.aasStore.getSelectedAAS;
        },
    },

    methods: {
        // Function to update the value of the property
        updateValue(updatedPropertyObject: any) {
            this.$emit('updateValue', updatedPropertyObject); // emit event to update the value in the parent component
        },
    },
});
</script>
