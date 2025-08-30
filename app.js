document.addEventListener("DOMContentLoaded", function() {

    let carData = JSON.parse(localStorage.getItem("carAppCarData") || "{}");
    if (!carData.mileage) carData.mileage = 0;
    if (!carData.mileageHistory) carData.mileageHistory = [];
    if (!carData.maintenanceRecords) carData.maintenanceRecords = [];

    const maintenanceRules = [
        { name: "Замена масла", kmInterval: 10000 },
        { name: "Воздушный фильтр", kmInterval: 15000 },
        { name: "Тормозные колодки", kmInterval: 30000 },
        { name: "Свечи зажигания", kmInterval: 40000 }
    ];

    // ===== Пробег =====
    function updateMileageDisplay() {
        const el = document.getElementById("currentMileage");
        if (el) el.textContent = carData.mileage + " км";
    }
    updateMileageDisplay();

    const mileageDisplay = document.getElementById("mileageDisplay");
    if (mileageDisplay) {
        mileageDisplay.onclick = function () {
            const input = document.getElementById("mileageInputModal");
            const modal = document.getElementById("mileageModal");
            input.value = "";
            input.placeholder = carData.mileage;
            modal.style.display = "flex";
            input.focus();
        };
    }

    window.closeMileageModal = function() {
        document.getElementById("mileageModal").style.display = "none";
    };

    window.saveMileageModal = function() {
        const input = document.getElementById("mileageInputModal");
        const newMileage = Number(input.value || carData.mileage);
        carData.mileage = newMileage;
        carData.mileageHistory.push({ date: new Date().toISOString().split('T')[0], mileage: newMileage });
        localStorage.setItem("carAppCarData", JSON.stringify(carData));
        updateMileageDisplay();
        updateMaintenanceStatus();
        closeMileageModal();
    };

    // ===== Обслуживание =====
    window.openMaintenanceModal = function() {
        document.getElementById("serviceMileage").value = carData.mileage;
        document.getElementById("serviceDate").value = new Date().toISOString().split('T')[0];
        document.getElementById("serviceNotes").value = "";

        document.getElementById("maintenanceForm").onsubmit = function(e) {
            e.preventDefault();
            const checkedItems = Array.from(document.querySelectorAll('input[name="items"]:checked')).map(el => el.value);
            if (!checkedItems.length) { alert("Выберите хотя бы один расходник"); return; }

            const mileage = Number(document.getElementById("serviceMileage").value);
            const date = document.getElementById("serviceDate").value;
            const notes = document.getElementById("serviceNotes").value;

            carData.maintenanceRecords.push({ items: checkedItems, mileage, date, notes });
            saveData();
            closeMaintenanceModal();
            renderMaintenanceList();
            updateMaintenanceStatus();
        };

        document.getElementById("maintenanceModal").style.display = "flex";
    };

    window.closeMaintenanceModal = function() {
        document.getElementById("maintenanceModal").style.display = "none";
    };

    function saveData() { localStorage.setItem("carAppCarData", JSON.stringify(carData)); }

    // ===== История обслуживания =====
    function renderMaintenanceList() {
        const list = document.getElementById("maintenanceList");
        list.innerHTML = "";
        carData.maintenanceRecords.forEach((rec, i) => {
            const li = document.createElement("li");
            li.className = "card";
            
            // Вычисляем сколько км назад было сделано обслуживание
            const kmAgo = carData.mileage - rec.mileage;
            const kmAgoText = kmAgo > 0 ? `${kmAgo} км назад` : "Сегодня";
            
            li.innerHTML = `
                <div class="km-ago">${kmAgoText}</div>
                <div class="maintenance-info">${rec.items.join(", ")}</div>
            `;
            li.onclick = () => openViewModal(i);
            list.appendChild(li);
        });
    }

    window.openViewModal = function(index) {
        const rec = carData.maintenanceRecords[index];
        const container = document.getElementById("maintenanceDetails");
        
        // Вычисляем сколько км назад было сделано обслуживание
        const kmAgo = carData.mileage - rec.mileage;
        const kmAgoText = kmAgo > 0 ? `${kmAgo} км назад` : "Сегодня";
        
        container.innerHTML = `
            <h3>Детали обслуживания</h3>
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <p style="margin: 0.3rem 0;"><strong>Дата:</strong> ${rec.date}</p>
                <p style="margin: 0.3rem 0;"><strong>Пробег:</strong> ${rec.mileage} км</p>
                <p style="margin: 0.3rem 0;"><strong>Выполнено:</strong> ${kmAgoText}</p>
            </div>
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <p style="margin: 0.3rem 0;"><strong>Расходники:</strong></p>
                <p style="margin: 0.3rem 0; color: #2c3e50;">${rec.items.join(", ")}</p>
            </div>
            ${rec.notes ? `
            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                <p style="margin: 0.3rem 0;"><strong>Примечания:</strong></p>
                <p style="margin: 0.3rem 0; color: #2c3e50;">${rec.notes}</p>
            </div>
            ` : ''}
            <div style="margin-top:1rem; display:flex; gap:0.5rem;">
                <button onclick="editMaintenance(${index})">Редактировать</button>
                <button onclick="deleteMaintenance(${index})" class="close-btn">Удалить</button>
            </div>
        `;
        document.getElementById("maintenanceViewModal").style.display = "flex";
    };

    window.closeViewModal = function() { document.getElementById("maintenanceViewModal").style.display = "none"; };

    window.deleteMaintenance = function(index) {
        if (confirm("Вы уверены, что хотите удалить запись?")) {
            carData.maintenanceRecords.splice(index, 1);
            saveData();
            renderMaintenanceList();
            updateMaintenanceStatus();
            closeViewModal();
        }
    };

    window.editMaintenance = function(index) {
        const rec = carData.maintenanceRecords[index];
        // Закрываем модальное окно просмотра перед открытием редактирования
        closeViewModal();
        openMaintenanceModal();
        document.getElementById("serviceMileage").value = rec.mileage;
        document.getElementById("serviceDate").value = rec.date;
        document.getElementById("serviceNotes").value = rec.notes;
        document.querySelectorAll('input[name="items"]').forEach(cb => {
            cb.checked = rec.items.includes(cb.value);
        });
        document.getElementById("maintenanceForm").onsubmit = function(e) {
            e.preventDefault();
            carData.maintenanceRecords[index] = {
                mileage: Number(document.getElementById("serviceMileage").value),
                date: document.getElementById("serviceDate").value,
                notes: document.getElementById("serviceNotes").value,
                items: Array.from(document.querySelectorAll('input[name="items"]:checked')).map(cb => cb.value)
            };
            saveData();
            renderMaintenanceList();
            updateMaintenanceStatus();
            closeMaintenanceModal();
        };
    };

    // ===== Статус ТО =====
    function updateMaintenanceStatus() {
        const statusEl = document.getElementById("maintenanceStatus");
        if (!carData.mileage) { statusEl.textContent = "Введите текущий пробег"; return; }

        let nextServiceKm = Infinity;
        let overdueItems = [];

        maintenanceRules.forEach(rule => {
            let lastMileage = 0;
            const recs = carData.maintenanceRecords.filter(r => r.items.includes(rule.name));
            if (recs.length) lastMileage = recs[recs.length-1].mileage;
            const kmLeft = rule.kmInterval - (carData.mileage - lastMileage);
            if (kmLeft < 0) overdueItems.push(rule.name);
            if (kmLeft < nextServiceKm) nextServiceKm = kmLeft;
        });

        if (overdueItems.length) {
            statusEl.textContent = `Срочно на ТО! (${overdueItems.length} просрочено)`;
            statusEl.style.background = "#e74c3c";
        } else if (nextServiceKm <= 1000) {
            statusEl.textContent = `ТО скоро! Через ${nextServiceKm} км`;
            statusEl.style.background = "#f39c12";
        } else {
            statusEl.textContent = `Следующее ТО через ${nextServiceKm} км`;
            statusEl.style.background = "#3498db";
        }
    }

    // ===== Модалка статуса ТО =====
    window.openStatusModal = function() {
        const container = document.getElementById("statusList");
        container.innerHTML = "";
        maintenanceRules.forEach(rule => {
            let lastMileage = 0;
            const recs = carData.maintenanceRecords.filter(r => r.items.includes(rule.name));
            if (recs.length) lastMileage = recs[recs.length - 1].mileage;
            const kmLeft = rule.kmInterval - (carData.mileage - lastMileage);

            const div = document.createElement("div");
            div.className = "list-item";
            const spanName = document.createElement("span");
            spanName.textContent = rule.name;
            spanName.style.fontWeight = "500";
            const spanStatus = document.createElement("span");
            spanStatus.textContent = kmLeft > 0 ? `Через ${kmLeft} км` : "Просрочено!";
            spanStatus.className = kmLeft > 0 ? "status-ok" : "status-due";
            div.appendChild(spanName);
            div.appendChild(spanStatus);
            container.appendChild(div);
        });

        document.getElementById("statusModal").style.display = "flex";
    };

    window.closeStatusModal = function() { document.getElementById("statusModal").style.display = "none"; };

    // ===== Инициализация =====
    renderMaintenanceList();
    updateMaintenanceStatus();

});
