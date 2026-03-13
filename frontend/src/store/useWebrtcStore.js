import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

export const useWebrtcStore = create((set, get) => ({
    iceServers : [],

    getIceServers : async () => {
        try{
            const res = await axiosInstance.get("/wrtcConfig");
            set({iceServers : res.data});
        }
        catch(err) {
            toast.error("error getting werbrtcConfig", err);
        }
    }
}));