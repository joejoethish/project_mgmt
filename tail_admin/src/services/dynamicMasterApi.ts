import axios from 'axios';
import {
    DynamicMaster,
    DynamicMasterData,
    CreateMasterRequest,
    CreateDataRequest,
    BulkCreateRequest,
    BulkCreateResponse
} from '../types/dynamicMaster';

const API_BASE = 'http://192.168.1.26:8000/api/masters';

// Master Definition APIs
export const mastersApi = {
    // List all masters
    listMasters: async (): Promise<DynamicMaster[]> => {
        const response = await axios.get(`${API_BASE}/masters/`);
        return response.data;
    },

    // Get single master
    getMaster: async (id: number): Promise<DynamicMaster> => {
        const response = await axios.get(`${API_BASE}/masters/${id}/`);
        return response.data;
    },

    // Create new master
    createMaster: async (data: CreateMasterRequest): Promise<DynamicMaster> => {
        const response = await axios.post(`${API_BASE}/masters/`, data);
        return response.data;
    },

    // Update master
    updateMaster: async (id: number, data: Partial<DynamicMaster>): Promise<DynamicMaster> => {
        const response = await axios.put(`${API_BASE}/masters/${id}/`, data);
        return response.data;
    },

    // Delete master (soft delete)
    deleteMaster: async (id: number): Promise<void> => {
        await axios.delete(`${API_BASE}/masters/${id}/`);
    },

    // Add field to master
    addField: async (masterId: number, fieldData: any): Promise<any> => {
        const response = await axios.post(`${API_BASE}/masters/${masterId}/add_field/`, fieldData);
        return response.data;
    }
};

// Dynamic Data APIs
export const dynamicDataApi = {
    // List all records for a master
    listData: async (masterName: string): Promise<DynamicMasterData[]> => {
        const response = await axios.get(`${API_BASE}/data/${masterName}/`);
        return response.data;
    },

    // Get single record
    getData: async (masterName: string, id: number): Promise<DynamicMasterData> => {
        const response = await axios.get(`${API_BASE}/data/${masterName}/${id}/`);
        return response.data;
    },

    // Create record
    createData: async (masterName: string, data: CreateDataRequest): Promise<DynamicMasterData> => {
        const response = await axios.post(`${API_BASE}/data/${masterName}/`, data);
        return response.data;
    },

    // Update record
    updateData: async (
        masterName: string,
        id: number,
        data: CreateDataRequest
    ): Promise<DynamicMasterData> => {
        const response = await axios.put(`${API_BASE}/data/${masterName}/${id}/`, data);
        return response.data;
    },

    // Delete record (soft delete)
    deleteData: async (masterName: string, id: number): Promise<void> => {
        await axios.delete(`${API_BASE}/data/${masterName}/${id}/`);
    },

    // Search records
    searchData: async (masterName: string, query: string): Promise<DynamicMasterData[]> => {
        const response = await axios.get(`${API_BASE}/data/${masterName}/search/`, {
            params: { q: query }
        });
        return response.data;
    },

    // Bulk create
    bulkCreate: async (
        masterName: string,
        data: BulkCreateRequest
    ): Promise<BulkCreateResponse> => {
        const response = await axios.post(`${API_BASE}/data/${masterName}/bulk/`, data);
        return response.data;
    }
};

