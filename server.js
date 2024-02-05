import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';


dotenv.config();
const cloudDataSchema = new mongoose.Schema({
    timestamp: Date,
    averageTemp: Number,
    averageCpuLoad: Number,
    averageRamLoad: Number,
    averageGpuTemp: Number,
    ramTotal: Number,
    ramUsed: Number,
    cpuCoreTotal: Number,
    cpuCoreUsed: Number,
    gpuTotal: Number,
    totalPowerConsumption: Number,
    cpuPowerConsumption: Number,    
    gpuPowerConsumption: Number,
    ramPowerConsumption: Number
}, { timestamps: true });

const DataModel = mongoose.model('Data', cloudDataSchema);

const uri = "mongodb+srv://hamada99:hamada99@cluster0.iszcqvt.mongodb.net/?retryWrites=true&w=majority"
const localUri = "mongodb://localhost:27017/CloudData"
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });



function mapHostData(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    const hosts = data[0].status.hosts;

    const dataMap = hosts.map(host => ({
        cpuTemp: host.cpu.temp.main,
        cpuLoad: host.cpu.load.main,
        ramLoad: host.ram.load.main,
        gpuTemps: host.gpu ? host.gpu.temp[0].main : null,
    }));

    return {
        averageTemp: +(dataMap.reduce((acc, curr) => acc + curr.cpuTemp, 0) / dataMap.length).toFixed(2),
        averageCpuLoad: +(dataMap.reduce((acc, curr) => acc + curr.cpuLoad, 0) / dataMap.length).toFixed(2),
        averageRamLoad: +(dataMap.reduce((acc, curr) => acc + curr.ramLoad, 0) / dataMap.length).toFixed(2),
        averageGpuTemp: +(dataMap.reduce((acc, curr) => acc + curr.gpuTemps, 0) / dataMap.length).toFixed(2),
    }
}

function mapCapData(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    const capacities = data[0].capacities;

    return {
        ramTotal: capacities.ram.total,
        ramUsed: capacities.ram.used,
        cpuCoreTotal: capacities.cpuCore.total,
        cpuCoreUsed: capacities.cpuCore.used,
        gpuTotal: capacities.gpu.total,
    }
}


function calculatePowerConsumption(statusData, capacitiesData) {
    // Constants for power consumption estimates (in watts)
    const avgPowerCPU = 95;  // Average power for CPU under full load
    const avgPowerGPU = 200; // Average power for GPU under full load
    const avgPowerRAM = 5;   // Average power for RAM under full load
    const idlePowerCPU = 10;
    const idlePowerGPU = 10;
    const idlePowerRAM = 2;


    let usage = {
        totalPowerConsumption: 0,
        cpuPowerConsumption: 0,
        gpuPowerConsumption: 0,
        ramPowerConsumption: 0
    }

    // let totalPowerConsumption = 0;

    // Assuming statusData and capacitiesData are arrays with one element each
    const statusHosts = statusData[0].status.hosts;
    const capacityHosts = capacitiesData[0].capacities.hosts;

    statusHosts.forEach(host => {
        const cpuLoadPercentage = host.cpu.load.main / 100; // Convert to fraction
        const matchingHost = capacityHosts.find(h => h.id === host.id);
        const gpuCount = matchingHost ? matchingHost.gpu.count : 0;

        const powerCPU = (cpuLoadPercentage * avgPowerCPU) / 1000; //delat med 1000 för att få kW
        const powerGPU = (gpuCount * avgPowerGPU) / 1000; // Assuming full load for GPUs delat med 1000 för att få kW

        // Ensure the values are treated as numbers
        usage.cpuPowerConsumption += parseFloat(powerCPU.toFixed(2));
        usage.gpuPowerConsumption += parseFloat(powerGPU.toFixed(2));
        usage.totalPowerConsumption += powerCPU + powerGPU; // This should be fine as it's already a numerical addition
    });
    return usage;
}

function fetchDataAndSave() {
    const statusUrl = 'https://api.cloud.cbh.kth.se/landing/v2/status?n=1';
    const capacitiesUrl = 'https://api.cloud.cbh.kth.se/landing/v2/capacities';

    Promise.all([
        axios.get(statusUrl),
        axios.get(capacitiesUrl)
    ]).then(([statusResponse, capacitiesResponse]) => {
        const mappedHostData = mapHostData(statusResponse.data);
        const mappedCapData = mapCapData(capacitiesResponse.data);
        const powerConsumption = calculatePowerConsumption(statusResponse.data, capacitiesResponse.data);
        const dataToSave = {
            ...mappedHostData,
            ...mappedCapData,
            ...powerConsumption,
            timestamp: new Date() // Capture the current time
        };

        DataModel.create(dataToSave).then(() => {
            console.log('Data saved successfully');
        }).catch(err => {
            console.error('Error saving data to MongoDB:', err);
        });

    }).catch(error => {
        console.error('Error fetching data:', error);
    });
}


fetchDataAndSave();
setInterval(fetchDataAndSave, 2000);