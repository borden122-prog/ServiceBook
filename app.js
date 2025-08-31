document.addEventListener("DOMContentLoaded", function() {

    let carData = JSON.parse(localStorage.getItem("carAppCarData") || "{}");
    if (!carData.mileage) carData.mileage = 0;
    if (!carData.mileageHistory) carData.mileageHistory = [];
    if (!carData.maintenanceRecords) carData.maintenanceRecords = [];
    if (!carData.itemSettings) carData.itemSettings = {};

    const maintenanceRules = [
        { name: "Масло и фильтр", kmInterval: 10000, icon: "🛢️" },
        { name: "Воздушный фильтр", kmInterval: 15000, icon: "💨" },
        { name: "Салонный фильтр", kmInterval: 15000, icon: "🌸" },
        { name: "Тормозные колодки", kmInterval: 30000, icon: "🛑" },
        { name: "Тормозная жидкость", kmInterval: 40000, icon: "💧" },
        { name: "Свечи зажигания", kmInterval: 40000, icon: "⚡" },
        { name: "Топливный фильтр", kmInterval: 30000, icon: "⛽" },
        { name: "Ремень ГРМ", kmInterval: 60000, icon: "➰" },
        { name: "Охлаждающая жидкость", kmInterval: 60000, icon: "❄️" },
        { name: "Трансмиссионное масло", kmInterval: 50000, icon: "⚙️" },
        { name: "Ремень генератора", kmInterval: 45000, icon: "🔋" }
    ];

    let currentStep = 1;
    let maintenanceData = {};

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
            showModal(modal);
            input.focus();
        };
    }

    window.closeMileageModal = function() {
        hideModal(document.getElementById("mileageModal"));
    };

    function getMaxRecordedMileage() {
        let maxMileage = 0;
        if (carData.maintenanceRecords.length > 0) {
            maxMileage = Math.max(...carData.maintenanceRecords.map(record => record.mileage));
        }
        return maxMileage;
    }

    function validateAndUpdateMileage(newMileage) {
        const maxRecordedMileage = getMaxRecordedMileage();
        if (newMileage < maxRecordedMileage) {
            throw new Error(`Судя по вашим записям, пробег не может быть меньше ${maxRecordedMileage} км`);
        }
        carData.mileage = newMileage;
        carData.mileageHistory.push({ 
            date: new Date().toISOString().split('T')[0], 
            mileage: newMileage 
        });
        localStorage.setItem("carAppCarData", JSON.stringify(carData));
        updateMileageDisplay();
        updateMaintenanceStatus();
    }

    window.saveMileageModal = function() {
        const input = document.getElementById("mileageInputModal");
        const newMileage = Number(input.value || carData.mileage);
        try {
            validateAndUpdateMileage(newMileage);
            closeMileageModal();
        } catch (error) {
            alert(error.message);
        }
    };

    // ===== Многошаговое добавление обслуживания =====
    window.startMaintenanceFlow = function() {
        currentStep = 1;
        maintenanceData = {};
        
        // Устанавливаем значения по умолчанию
        document.getElementById("serviceDate").value = new Date().toISOString().split('T')[0];
        const serviceMileageInput = document.getElementById("serviceMileage");
        serviceMileageInput.value = "";
        serviceMileageInput.placeholder = carData.mileage;
        document.getElementById("serviceNotes").value = "";
        
        // Сбрасываем чекбоксы
        document.querySelectorAll('input[name="items"]').forEach(cb => cb.checked = false);
        
        showStep(1);
        showModal(document.getElementById("maintenanceFlowModal"));
    };

    window.closeMaintenanceFlow = function() {
        hideModal(document.getElementById("maintenanceFlowModal"));
        currentStep = 1;
        maintenanceData = {};
    };

    window.nextStep = function() {
        if (currentStep === 1) {
            const date = document.getElementById("serviceDate").value;
            const mileageInput = document.getElementById("serviceMileage");
            const mileage = Number(mileageInput.value || mileageInput.placeholder);
            
            if (!date || !mileage) {
                alert("Пожалуйста, заполните все поля");
                return;
            }
            
            maintenanceData.date = date;
            maintenanceData.mileage = mileage;
            showStep(2);
        } else if (currentStep === 2) {
            const checkedItems = Array.from(document.querySelectorAll('input[name="items"]:checked')).map(el => el.value);
            maintenanceData.items = checkedItems;
            showStep(3);
        }
    };

    window.prevStep = function() {
        if (currentStep === 2) {
            showStep(1);
        } else if (currentStep === 3) {
            showStep(2);
        }
    };

    window.saveMaintenance = function() {
        const notes = document.getElementById("serviceNotes").value;
        maintenanceData.notes = notes;
        
        // Проверяем, что есть либо расходники, либо примечания
        if ((!maintenanceData.items || maintenanceData.items.length === 0) && !notes.trim()) {
            alert("Пожалуйста, укажите расходники или опишите дополнительные работы");
            return;
        }
        
        // Если нет расходников, создаем пустой массив
        if (!maintenanceData.items) {
            maintenanceData.items = [];
        }

        try {
            // Если пробег в записи больше текущего, обновляем текущий пробег
            if (maintenanceData.mileage > carData.mileage) {
                validateAndUpdateMileage(maintenanceData.mileage);
            } else {
                // Проверяем, что пробег не меньше максимального в записях
                const maxRecordedMileage = getMaxRecordedMileage();
                if (maintenanceData.mileage < maxRecordedMileage) {
                    throw new Error(`Пробег не может быть меньше ${maxRecordedMileage} км по предыдущим записям`);
                }
            }
            
            carData.maintenanceRecords.push(maintenanceData);
            saveData();
            closeMaintenanceFlow();
            renderMaintenanceList();
            updateMaintenanceStatus();
            renderItemsGrid();
        } catch (error) {
            alert(error.message);
        }
    };

    function showStep(step) {
        currentStep = step;
        
        // Скрываем все шаги
        document.querySelectorAll('.flow-step').forEach(el => el.style.display = 'none');
        
        // Показываем нужный шаг
        document.getElementById(`step${step}`).style.display = 'block';
        
        // Обновляем заголовки кнопок
        if (step === 2) {
            const nextBtn = document.querySelector('#step2 .modal-buttons button:last-child');
            if (nextBtn) {
                nextBtn.textContent = maintenanceData.items && maintenanceData.items.length > 0 ? 'Далее' : 'Пропустить';
            }
        }
    }

    function saveData() { 
        localStorage.setItem("carAppCarData", JSON.stringify(carData)); 
    }

    // ===== История обслуживания =====
    function renderMaintenanceList() {
        const list = document.getElementById("maintenanceList");
        list.innerHTML = "";
        
        // Создаем копию массива для сортировки
        const sortedRecords = [...carData.maintenanceRecords].sort((a, b) => {
            // Сначала сортируем по пробегу (по убыванию)
            if (b.mileage !== a.mileage) {
                return b.mileage - a.mileage;
            }
            // Если пробег одинаковый, сортируем по дате (по убыванию)
            return new Date(b.date) - new Date(a.date);
        });

        sortedRecords.forEach((rec, i) => {
            const li = document.createElement("li");
            li.className = "card";
            
            // Вычисляем сколько км назад было сделано обслуживание
            const kmAgo = carData.mileage - rec.mileage;
            let kmAgoText;
            
            if (rec.mileage === carData.mileage) {
                kmAgoText = "Недавно";
            } else if (kmAgo > 0) {
                kmAgoText = `${kmAgo} км назад`;
            } else {
                kmAgoText = "Сегодня";
            }
            
            li.innerHTML = `
                <div class="km-ago">${kmAgoText}</div>
                <div class="maintenance-info">${rec.items.join(", ")}</div>
            `;
            // Используем индекс из оригинального массива для openViewModal
            const originalIndex = carData.maintenanceRecords.indexOf(rec);
            li.onclick = () => openViewModal(originalIndex);
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
            <div style="padding: 0 1.5rem;">
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p style="margin: 0.3rem 0;"><strong>Дата:</strong> ${rec.date}</p>
                    <p style="margin: 0.3rem 0;"><strong>Пробег:</strong> ${rec.mileage} км</p>
                    <p style="margin: 0.3rem 0;"><strong>Выполнено:</strong> ${kmAgoText}</p>
                </div>
                ${rec.items && rec.items.length > 0 ? `
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p style="margin: 0.3rem 0;"><strong>Расходники:</strong></p>
                    <p style="margin: 0.3rem 0; color: #2c3e50;">${rec.items.join(", ")}</p>
                </div>
                ` : ''}
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
            </div>
        `;
        showModal(document.getElementById("maintenanceViewModal"));
    };

    window.closeViewModal = function() { 
        hideModal(document.getElementById("maintenanceViewModal")); 
    };

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
        closeViewModal();
        
        // Заполняем данные для редактирования
        maintenanceData = { ...rec };
        currentStep = 1;
        
        document.getElementById("serviceDate").value = rec.date;
        document.getElementById("serviceMileage").value = rec.mileage;
        document.getElementById("serviceNotes").value = rec.notes || "";
        
        document.querySelectorAll('input[name="items"]').forEach(cb => {
            cb.checked = rec.items && rec.items.includes(cb.value);
        });
        
        showStep(1);
        showModal(document.getElementById("maintenanceFlowModal"));
        
        // Переопределяем функцию сохранения для редактирования
        const originalSaveMaintenance = window.saveMaintenance;
        window.saveMaintenance = function() {
            const notes = document.getElementById("serviceNotes").value;
            maintenanceData.notes = notes;
            maintenanceData.items = Array.from(document.querySelectorAll('input[name="items"]:checked')).map(cb => cb.value);
            
            if ((!maintenanceData.items || maintenanceData.items.length === 0) && !notes.trim()) {
                alert("Пожалуйста, укажите расходники или опишите дополнительные работы");
                return;
            }
            
            carData.maintenanceRecords[index] = maintenanceData;
            saveData();
            closeMaintenanceFlow();
            renderMaintenanceList();
            updateMaintenanceStatus();
            
            // Восстанавливаем оригинальную функцию
            window.saveMaintenance = originalSaveMaintenance;
        };
    };

    // ===== Статус ТО =====
    function updateMaintenanceStatus() {
        const statusEl = document.getElementById("maintenanceStatus");
        if (!carData.mileage) { 
            statusEl.textContent = "Введите текущий пробег"; 
            statusEl.className = "status-block status-normal";
            return; 
        }

        let nextServiceKm = Infinity;
        let overdueItems = [];

        maintenanceRules.forEach(rule => {
            let lastMileage = 0;
            const recs = carData.maintenanceRecords.filter(r => r.items && r.items.includes(rule.name));
            if (recs.length) lastMileage = recs[recs.length-1].mileage;
            const kmLeft = rule.kmInterval - (carData.mileage - lastMileage);
            if (kmLeft < 0) overdueItems.push(rule.name);
            if (kmLeft < nextServiceKm) nextServiceKm = kmLeft;
        });

        // Удаляем старые классы
        statusEl.className = "status-block";
        
        if (overdueItems.length) {
            statusEl.textContent = `Срочно на ТО! (${overdueItems.length} просрочено)`;
            statusEl.classList.add("status-danger");
        } else if (nextServiceKm <= 100) {
            statusEl.textContent = `ТО срочно! Через ${nextServiceKm} км`;
            statusEl.classList.add("status-danger");
        } else if (nextServiceKm <= 1000) {
            statusEl.textContent = `ТО скоро! Через ${nextServiceKm} км`;
            statusEl.classList.add("status-warning");
        } else {
            statusEl.textContent = `Следующее ТО через ${nextServiceKm} км`;
            statusEl.classList.add("status-normal");
        }
    }

    // ===== Табы и расходники =====
    window.switchTab = function(tabName) {
        // Обновляем активную кнопку
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
            btn.textContent.toLowerCase() === (tabName === 'records' ? 'записи' : 'расходники')
        );
        if (activeBtn) activeBtn.classList.add('active');

        // Показываем нужный контент
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');

        if (tabName === 'items') {
            renderItemsGrid();
        }
    };

    function renderItemsGrid() {
        const grid = document.querySelector('.items-grid');
        grid.innerHTML = '';
        grid.style.display = 'flex';
        grid.style.flexDirection = 'column';

        maintenanceRules.forEach(rule => {
            const settings = carData.itemSettings[rule.name] || {};
            const customInterval = settings.interval || rule.kmInterval;
            
            // Находим последнюю замену
            let lastMileage = 0;
            const recs = carData.maintenanceRecords.filter(r => r.items && r.items.includes(rule.name));
            if (recs.length) lastMileage = recs[recs.length-1].mileage;
            
            // Вычисляем прогресс
            const kmSinceLastChange = carData.mileage - lastMileage;
            const progress = (kmSinceLastChange / customInterval) * 100;
            
            // Определяем статус
            let status = '';
            let statusText = '';
            if (progress >= 100) {
                status = 'danger';
                statusText = 'Требуется замена';
            } else if (progress >= 90) {
                status = 'warning';
                statusText = 'Скоро замена';
            } else {
                statusText = `Через ${Math.round(customInterval - kmSinceLastChange)} км`;
            }

            const card = document.createElement('div');
            card.className = 'item-card';
            card.onclick = () => openItemEditModal(rule.name);
            card.innerHTML = `
                <div class="item-name">${rule.icon} ${rule.name}</div>
                <div class="item-progress">
                    <div class="progress-bar ${status}" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <div class="item-info">${statusText}</div>
                ${settings.notes ? `<div class="item-info">${settings.notes}</div>` : ''}
            `;
            grid.appendChild(card);
        });
    }

    window.openItemEditModal = function(itemName) {
        const rule = maintenanceRules.find(r => r.name === itemName);
        const settings = carData.itemSettings[itemName] || {};
        
        document.querySelector('#itemEditModal .modal-header h3').textContent = 
            `${rule.icon} ${itemName}`;
        
        document.getElementById('itemInterval').value = settings.interval || rule.kmInterval;
        document.getElementById('itemInterval').placeholder = rule.kmInterval;
        document.getElementById('itemNotes').value = settings.notes || '';
        
        showModal(document.getElementById('itemEditModal'));
        
        // Сохраняем имя текущего расходника для использования при сохранении
        document.getElementById('itemEditModal').dataset.itemName = itemName;
    };

    window.closeItemEditModal = function() {
        hideModal(document.getElementById('itemEditModal'));
    };

    window.saveItemEdit = function() {
        const modal = document.getElementById('itemEditModal');
        const itemName = modal.dataset.itemName;
        const interval = Number(document.getElementById('itemInterval').value);
        const notes = document.getElementById('itemNotes').value.trim();
        
        if (!carData.itemSettings[itemName]) {
            carData.itemSettings[itemName] = {};
        }
        
        if (interval) {
            carData.itemSettings[itemName].interval = interval;
        }
        
        if (notes) {
            carData.itemSettings[itemName].notes = notes;
        }
        
        saveData();
        renderItemsGrid();
        closeItemEditModal();
    };

    // ===== Модалка статуса ТО =====
    window.openStatusModal = function() {
        const container = document.getElementById("statusList");
        container.innerHTML = "";
        maintenanceRules.forEach(rule => {
            let lastMileage = 0;
            const recs = carData.maintenanceRecords.filter(r => r.items && r.items.includes(rule.name));
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

        showModal(document.getElementById("statusModal"));
    };

    window.closeStatusModal = function() { 
        hideModal(document.getElementById("statusModal")); 
    };

    // ===== Утилиты для модальных окон =====
    function showModal(modal) {
        modal.style.display = "flex";
        setTimeout(() => {
            modal.classList.add("show");
        }, 10);
    }

    function hideModal(modal) {
        modal.classList.remove("show");
        setTimeout(() => {
            modal.style.display = "none";
        }, 300);
    }

    // ===== Инициализация =====
    renderMaintenanceList();
    updateMaintenanceStatus();

});
