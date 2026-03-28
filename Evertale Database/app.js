// 禁用右键菜单
document.addEventListener('contextmenu', event => event.preventDefault());

// 禁用 F12 和 Ctrl+Shift+I 等快捷键
document.addEventListener('keydown', function(e) {
    if(e.keyCode == 123) {
        e.preventDefault();
        return false;
    }
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)){
        e.preventDefault();
        return false;
    }
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)){
        e.preventDefault();
        return false;
    }
    if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)){
        e.preventDefault();
        return false;
    }
    if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)){
        e.preventDefault();
        return false;
    }
});
const proxy = "https://cors-proxy.evertale.qzz.io/?";
const url_monster = proxy + "https://prd.evertaleserver.com/Prd280/Monster.json";
const url_boss = proxy + "https://prd.evertaleserver.com/Prd280/Boss.json";
const url_weapon = proxy + "https://prd.evertaleserver.com/Prd280/Weapon.json";
const url_equip = proxy + "https://prd.evertaleserver.com/Prd280/Equipment.json";

const url_lang = proxy + "https://prd.evertaleserver.com/Prd280/Localization/Localizable_ChineseSimplified.txt";
const url_ability = proxy + "https://prd.evertaleserver.com/Prd280/Ability.json";
const url_buff = proxy + "https://prd.evertaleserver.com/Prd280/Buff.json";
const url_ability_ai = proxy + "https://prd.evertaleserver.com/Prd280/AbilityAI.json";
const url_ai_threat = proxy + "https://prd.evertaleserver.com/Prd280/AIThreat.json";
const url_relationship = proxy + "https://evertale.qzz.io/Config/Relationship.json";

let dictionary = {}; 
let monsterData = [], bossData = [], weaponData = [], equipData = [];
let abilityData = {}; 
let buffData = {}; 
let abilityAiData = {};
let aiThreatData = {};
let relationshipData = {};

let currentCategory = 'Monster';

// 记录上次看的形态基底，防止切形态时乱切大图
window.lastViewedBaseId = "";

async function init() {
    try {
        await Promise.all([
            fetchLanguage(),
            fetchData(url_monster, 'Monster').then(d => monsterData = d),
            fetchData(url_boss, 'Monster').then(d => bossData = d),
            fetchData(url_weapon, 'Weapon').then(d => weaponData = d),
            fetchData(url_equip, 'Equipment').then(d => equipData = d),
            fetchAbilities(),
            fetchBuffs(),
            fetchAbilityAI(),
            fetchAIThreat(),
            fetchRelationships()
        ]);
        
        document.getElementById("searchInput").addEventListener("input", buildDropdown);
        
        document.getElementById("monsterSelect").addEventListener("change", function() {
            let idx = this.value;
            if (idx === "") {
                document.getElementById("monsterInfo").innerHTML = "请在上方选择...";
                return;
            }
            
            let activeData = currentCategory === 'Monster' ? monsterData : 
                             currentCategory === 'Weapon' ? weaponData : 
                             currentCategory === 'Equipment' ? equipData : bossData;
                             
            let item = activeData[idx];
            let baseId = item.name;
            let matchId = item.name.match(/^(.*?)(\d{2})$/);
            if (matchId) baseId = matchId[1];
            
            let formIdx = idx;
            // 为 武器 和 BOSS 自动优先寻找最高形态预载入，普通角色保留形态二机制
            if (currentCategory === 'Weapon' || currentCategory === 'Boss') {
                let form3Idx = activeData.findIndex(m => m.name === baseId + "03");
                let form2Idx = activeData.findIndex(m => m.name === baseId + "02");
                if (form3Idx !== -1) formIdx = form3Idx;
                else if (form2Idx !== -1) formIdx = form2Idx;
            } else if (currentCategory === 'Monster') {
                let form2Idx = activeData.findIndex(m => m.name === baseId + "02");
                if (form2Idx !== -1) formIdx = form2Idx;
            }
            
            showInfo(formIdx, true); 
        });

        switchCategory('Monster'); 
    } catch (error) {
        document.getElementById("monsterSelect").innerHTML = "<option>加载失败，请检查网络</option>";
        console.error("出错了：", error);
    }
}

async function fetchData(url, key) {
    const res = await fetch(url);
    const data = await res.json();
    return data[key];
}

window.switchCategory = function(cat) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.cat-btn[onclick="switchCategory('${cat}')"]`).classList.add('active');
    
    let sortEl = document.getElementById('sortSelectContainer');
    let weapSkillRow = document.getElementById('filter-row-weapskill');
    
    if (cat === 'Monster' || cat === 'Boss' || cat === 'Weapon') {
        document.getElementById('filter-row-weapon').style.display = 'flex';
        document.getElementById('filter-row-element').style.display = (cat === 'Weapon') ? 'none' : 'flex';
        if (weapSkillRow) weapSkillRow.style.display = (cat === 'Weapon') ? 'flex' : 'none';
        
        if (cat === 'Weapon') {
            document.getElementById('weapon-label-text').innerHTML = '<span>种</span><span>类</span><span>:</span>';
        } else {
            document.getElementById('weapon-label-text').innerHTML = '<span>武</span><span>器</span><span>:</span>';
        }

        sortEl.innerHTML = `
            <label class="filter-pill"><input type="radio" name="sortMode" value="default" onchange="buildDropdown()" checked><span>默认</span></label>
            <label class="filter-pill"><input type="radio" name="sortMode" value="speed" onchange="buildDropdown()"><span>速度</span></label>
            <label class="filter-pill"><input type="radio" name="sortMode" value="atk1" onchange="buildDropdown()"><span>一阶攻击</span></label>
            <label class="filter-pill"><input type="radio" name="sortMode" value="hp1" onchange="buildDropdown()"><span>一阶生命</span></label>
            <label class="filter-pill"><input type="radio" name="sortMode" value="atk2" onchange="buildDropdown()"><span>二阶攻击</span></label>
            <label class="filter-pill"><input type="radio" name="sortMode" value="hp2" onchange="buildDropdown()"><span>二阶生命</span></label>
        `;
    } else if (cat === 'Equipment') {
        document.getElementById('filter-row-element').style.display = 'none';
        document.getElementById('filter-row-weapon').style.display = 'none';
        if (weapSkillRow) weapSkillRow.style.display = 'none';
        
        sortEl.innerHTML = `
            <label class="filter-pill"><input type="radio" name="sortMode" value="default" onchange="buildDropdown()" checked><span>默认</span></label>
            <label class="filter-pill"><input type="radio" name="sortMode" value="atk1" onchange="buildDropdown()"><span>基础攻击</span></label>
            <label class="filter-pill"><input type="radio" name="sortMode" value="hp1" onchange="buildDropdown()"><span>基础生命</span></label>
            <label class="filter-pill"><input type="radio" name="sortMode" value="speed" onchange="buildDropdown()"><span>速度</span></label>
        `;
    }
    buildDropdown();
};

window.toggleFilterPanel = function() {
    let panel = document.getElementById("filterPanel");
    panel.style.display = panel.style.display === "flex" ? "none" : "flex";
};

window.handleSortDirectionChange = function() {
    let cb = document.getElementById("reverseBtn");
    document.getElementById("sortDirText").innerText = cb.checked ? "⬆️ 升序" : "⬇️ 降序";
    buildDropdown();
};

window.handleFilterChange = function(className) {
    let checkboxes = document.querySelectorAll('.' + className);
    if (checkboxes.length === 0) return;
    let allChecked = Array.from(checkboxes).every(cb => cb.checked);
    let btn = document.getElementById('toggle-btn-' + className);
    if (btn) {
        btn.innerText = allChecked ? "一键不选" : "一键全选";
    }
    buildDropdown();
};

window.toggleFilterRow = function(className) {
    let checkboxes = document.querySelectorAll('.' + className);
    if (checkboxes.length === 0) return;
    let allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    handleFilterChange(className);
};

window.switchPic = function(type) {
    document.querySelectorAll('.portrait-img').forEach(img => img.style.display = 'none');
    document.querySelectorAll('.gallery-btn').forEach(btn => btn.classList.remove('active'));
    let targetImg = document.getElementById('pic-' + type);
    let targetBtn = document.getElementById('btn-' + type);
    if (targetImg) targetImg.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');
};

window.handleImgError = function(type) {
    let img = document.getElementById('pic-' + type);
    let btn = document.getElementById('btn-' + type);
    if (img) img.remove();
    if (btn) btn.remove();
    let remainingBtns = document.querySelectorAll('.gallery-btn');
    if (remainingBtns.length > 0) remainingBtns[0].click();
    else document.querySelector('.images-container').innerHTML = "<p style='color:#999;'>暂无图鉴</p>";
};

window.toggleAILogic = function(btn) {
    let target = btn.nextElementSibling;
    if (target.style.display === "none") {
        target.style.display = "block";
        btn.innerText = "收起 AI 逻辑 ▲";
    } else {
        target.style.display = "none";
        btn.innerText = "查看 AI 逻辑 ▼";
    }
};

window.toggleAllAILogic = function(btn) {
    let boxes = document.querySelectorAll('.ai-logic-box');
    let btns = document.querySelectorAll('.ai-toggle-btn');
    if (boxes.length === 0) return;
    
    let isAnyHidden = Array.from(boxes).some(b => b.style.display === 'none');
    boxes.forEach(b => b.style.display = isAnyHidden ? 'block' : 'none');
    btns.forEach(b => b.innerText = isAnyHidden ? '收起 AI 逻辑 ▲' : '查看 AI 逻辑 ▼');
    
    btn.innerText = isAnyHidden ? '一键收起所有 AI 逻辑' : '一键展开所有 AI 逻辑';
};

// =====================================
// 🌟 战力计算器引擎：TXT 1:1 精确复刻版
// =====================================

// 完全复原TXT的原生MaxLV逻辑
function getMaxLv(currStars, maxStars, extraEvolves, isFree = false) {
    let level = 30;
    if (currStars <= 3) {
        if (currStars === 3 && maxStars === 4) level = 50;
        else level = 30;
    } else {
        if (currStars === 4) level = 60;
        if (currStars === 5) level = 80;
        if (currStars === 6) level = 100;
        
        // 如果是满星，或者开启了自由模式（无限制）
        if (currStars === maxStars || isFree) level += 20 * extraEvolves;
    }
    return level;
}

// 获取允许输入的最低等级
window.getLowestLV = function() {
    let lb = Number(document.getElementById("calc_lb").value);
    let minLb = Number(document.getElementById("calc_minLb").value);
    let starsCurr = Number(document.getElementById("calc_starsCurr").value);
    let starsMax = Number(document.getElementById("calc_starsMax").value);
    let baseId = document.getElementById("calc_baseId").value;
    let stageNum = document.getElementById("calc_stageNum").value;

    let lv = 1;
    if (lb === 0) {
        let preStage = String(Number(stageNum) - 1).padStart(2, "0");
        let preItem = window.activeDataCache.find(m => m.name === baseId + preStage);
        lv = (preItem && preItem.freeEvolveLevel) ? preItem.freeEvolveLevel : 1;
    } else if (lb === minLb) {
        lv = getMaxLv(starsCurr - 1, starsMax, 0);
    } else {
        lv = getMaxLv(starsCurr, starsMax, lb - minLb - 1);
    }
    return lv;
};

// 获取允许输入的最高等级
window.getHigestLV = function() {
    let lb = Number(document.getElementById("calc_lb").value);
    let minLb = Number(document.getElementById("calc_minLb").value);
    let starsCurr = Number(document.getElementById("calc_starsCurr").value);
    let starsMax = Number(document.getElementById("calc_starsMax").value);
    let isFree = document.getElementById("calc_free_input").checked;
    
    if (isFree) return 999;

    let id = document.getElementById("calc_id").value;
    let currentItem = window.activeDataCache.find(m => m.name === id);
    
    let lv = (currentItem && currentItem.freeEvolveLevel) ? currentItem.freeEvolveLevel : getMaxLv(starsCurr, starsMax, lb - minLb);
    return lv;
};

function getBonus_Awakening(isWeapon, awakening, maxStar) {
    switch (maxStar) {
        case 4: return awakening * 0.05 + 1;
        case 5: return awakening * 0.075 + 1;
        case 6:
            if (isWeapon) {
                switch (awakening) {
                    case 0: return 1;
                    case 1: return 1.19;
                    case 2: return 1.33;
                    case 3: return 1.44;
                    default: return 1.55;
                }
            } else {
                switch (awakening) {
                    case 0: return 1;
                    case 1: return 1.22;
                    case 2: return 1.44;
                    case 3: return 1.66;
                    default: return 1.88;
                }
            }
        default: return 1;
    }
}

function getMultiplier_Awakening(isAtk, maxStar) {
    switch (maxStar) {
        case 6: return isAtk ? 248 : 1239;
        case 5: return isAtk ? 82 : 412;
        case 4: return isAtk ? 40 : 201;
        default: return 0;
    }
}

function getBonus_Boost(isAtk, isWeapon, boost) {
    const boost_lowerPart = boost > 90 ? 90 : boost;
    const boost_upperPart = boost > 90 ? boost - 90 : 0;
    const weight_lower = isAtk ? 3 : 14;
    const weight_upper = isAtk ? (isWeapon ? 3 : 73) : isWeapon ? 14 : 311;
    return weight_lower * boost_lowerPart + weight_upper * boost_upperPart;
}

function bankersRound(v) {
    let intPart = Math.floor(v);
    let fracPart = v - intPart;
    if (Math.abs(fracPart) !== 0.5) {
        return Math.round(v);
    } else {
        return intPart % 2 === 0 ? intPart : intPart + (v > 0 ? 1 : -1);
    }
}

function calculateFinalPower(trueAtk, trueHp, isWeapon, masteryLevel, maxStar) {
    let powerVal = trueAtk * 30 + trueHp * 6;
    if (!isWeapon) {
        powerVal *= 1 + masteryLevel * 0.005;
        switch (maxStar) {
            case 6: powerVal *= 2; break;
            case 5: powerVal *= 1.5; break;
        }
    }
    return bankersRound(powerVal);
}

function calculateStatAprox(isAtk, isWeapon, forPower, statsForCalc) {
    const baseStat = isAtk ? statsForCalc.baseAtk : statsForCalc.baseHp;
    let statVal = 0;
    
    statVal = baseStat * (1 + (statsForCalc.level - 30) * 0.025) * (statsForCalc.extraEvolves * 0.08 + 1) * (statsForCalc.refine / 10000 + 1);

    if (forPower) {
        let statVal_temp1 = statVal * getBonus_Awakening(isWeapon, statsForCalc.awakening, statsForCalc.starsMax);
        let statVal_temp2 = statVal + getMultiplier_Awakening(isAtk, statsForCalc.starsMax) * statsForCalc.awakening;
        statVal = Math.max(statVal_temp1, statVal_temp2);
    } else {
        statVal *= getBonus_Awakening(isWeapon, statsForCalc.awakening, statsForCalc.starsMax);
    }

    statVal += getBonus_Boost(isAtk, isWeapon, statsForCalc.boost);

    if (!isWeapon && statsForCalc.isCosmo) {
        const extraEvolvesForMaxLv = statsForCalc.starsMax > 3 ? 5 : 0;
        statVal += baseStat * (1 + (getMaxLv(statsForCalc.starsCurrent, statsForCalc.starsMax, extraEvolvesForMaxLv) - 30) * 0.025) * ((statsForCalc.refine / 10000 + 1) * 0.07);
    }

    return statVal;
}

// UI 事件挂载与输入强校验 (完全按照TXT)
window.handleLevelChange = function() {
    let isFree = document.getElementById("calc_free_input").checked;
    let levelEl = document.getElementById("calc_level");
    let refineEl = document.getElementById("calc_refine");
    let cosmoCb = document.getElementById("calc_cosmo");
    
    let awaken = Number(document.getElementById("calc_awaken").value);
    
    let v = Math.floor(levelEl.value);
    let minV = isFree ? 1 : window.getLowestLV();
    let maxV = window.getHigestLV();
    
    v = Math.max(v, minV);
    if(!isFree) v = Math.min(v, maxV);
    levelEl.value = v;

    // 潜能锁定逻辑 (≥40级才能锻炼)
    if (v >= 40 || isFree) {
        refineEl.disabled = false;
    } else {
        refineEl.disabled = true;
        refineEl.value = 0;
    }

    // 超越锁定逻辑 (≥100级且觉醒4阶才能超越)
    if (cosmoCb) {
        if ((awaken >= 4 && v >= 100) || isFree) {
            cosmoCb.disabled = false;
        } else {
            cosmoCb.disabled = true;
            cosmoCb.checked = false;
        }
    }
    
    runCalculator();
};

window.handleLbChange = function() {
    let isFree = document.getElementById("calc_free_input").checked;
    let lbEl = document.getElementById("calc_lb");
    
    let minV = Number(document.getElementById("calc_minLb").value);
    let starsCurr = Number(document.getElementById("calc_starsCurr").value);
    let starsMax = Number(document.getElementById("calc_starsMax").value);
    
    let v = Math.floor(lbEl.value);
    // TXT核心机制复原：最大上限为 minV + 5 (即自带层数 + 5次强化)
    let maxV = isFree ? 999 : ((starsMax > 3 && starsCurr === starsMax) ? minV + 5 : minV);
    
    v = Math.max(v, isFree ? 0 : minV);
    if(!isFree) v = Math.min(v, maxV);
    lbEl.value = v;
    
    if (!isFree) window.handleLevelChange(); 
    else runCalculator();
};

window.handleAwakenChange = function() {
    let isFree = document.getElementById("calc_free_input").checked;
    let awakenEl = document.getElementById("calc_awaken");
    let starsMax = Number(document.getElementById("calc_starsMax").value);
    
    let v = Math.floor(awakenEl.value);
    let minV = 0;
    let maxV = isFree ? 999 : (starsMax > 3 ? 4 : 0);
    
    v = Math.max(v, minV);
    if(!isFree) v = Math.min(v, maxV);
    awakenEl.value = v;
    
    handleLevelChange(); // 觉醒可能会影响超越(cosmo)的判定
};

window.handleCosmoChange = function() {
    runCalculator();
};

window.handleFreeInputChange = function() {
    let isFree = document.getElementById("calc_free_input").checked;
    if (!isFree) {
        handleLbChange();
        handleAwakenChange();
        handleLevelChange();
    }
    runCalculator();
};

window.setMaxStats = function() {
    let isFree = document.getElementById("calc_free_input").checked;
    let starsCurr = Number(document.getElementById("calc_starsCurr").value);
    let starsMax = Number(document.getElementById("calc_starsMax").value);
    let minLb = Number(document.getElementById("calc_minLb").value);
    let category = document.getElementById("calc_category").value;
    
    let isWeapon = category === 'Weapon';

    // 突破默认设定最大值
    document.getElementById("calc_lb").value = (starsMax > 3 && starsCurr === starsMax) ? minLb + 5 : minLb;
    
    document.getElementById("calc_level").value = isFree ? 200 : window.getHigestLV();
    document.getElementById("calc_awaken").value = starsMax > 3 ? 4 : 0; 
    document.getElementById("calc_boost").value = 300;
    
    let refineEl = document.getElementById("calc_refine");
    if (document.getElementById("calc_level").value >= 40 || isFree) {
        refineEl.disabled = false;
        refineEl.value = 100;
    } else {
        refineEl.disabled = true;
        refineEl.value = 0;
    }
    
    if (!isWeapon) document.getElementById("calc_mastery").value = starsMax > 3 ? 40 : 0;
    
    let cosmoCb = document.getElementById("calc_cosmo");
    if (cosmoCb) {
        if (starsCurr === 6 && document.getElementById("calc_awaken").value >= 4 && document.getElementById("calc_level").value >= 100) {
            cosmoCb.disabled = false;
            cosmoCb.checked = true;
        } else {
            cosmoCb.disabled = true;
            cosmoCb.checked = false;
        }
    }
    
    runCalculator();
};

window.runCalculator = function() {
    let baseAtk = Number(document.getElementById("calc_atkBase").value);
    let baseHp = Number(document.getElementById("calc_hpBase").value);
    let starsMax = Number(document.getElementById("calc_starsMax").value);
    let starsCurr = Number(document.getElementById("calc_starsCurr").value) || starsMax;
    let minLb = Number(document.getElementById("calc_minLb").value);
    let category = document.getElementById("calc_category").value;
    
    let level = Number(document.getElementById("calc_level").value);
    let lb = Number(document.getElementById("calc_lb").value);
    let awaken = Number(document.getElementById("calc_awaken").value);
    let boost = Number(document.getElementById("calc_boost").value);
    let refine = Number(document.getElementById("calc_refine").value) || 0; 
    
    let masteryEl = document.getElementById("calc_mastery");
    let mastery = masteryEl ? Number(masteryEl.value) : 0;
    
    let cosmoCb = document.getElementById("calc_cosmo");
    let isCosmo = cosmoCb ? cosmoCb.checked : false;
    let includePassives = document.getElementById("calc_include_passives") ? document.getElementById("calc_include_passives").checked : false;

    let isWeapon = category === 'Weapon'; 

    let statsInput = {
        baseAtk: baseAtk,
        baseHp:  baseHp,
        starsCurrent: starsCurr,
        starsMax: starsMax,
        extraEvolves: lb - minLb, // 🎯【TXT最核心逻辑】：减去基底突破才是真正的乘区计算倍率！
        level: level,
        awakening: awaken,
        isCosmo: isCosmo,
        boost: boost,
        refine: refine * 100, // 潜能换算
        mastery: mastery
    };

    let trueAtk = 0;
    let trueHp = 0;
    let powAtk = 0;
    let powHp = 0;

    // 武器是Math.floor，非武器是bankersRound 四舍五入到偶数
    if (isWeapon) {
        trueAtk = Math.floor(calculateStatAprox(true, isWeapon, false, statsInput));
        trueHp = Math.floor(calculateStatAprox(false, isWeapon, false, statsInput));
    } else {
        trueAtk = bankersRound(calculateStatAprox(true, isWeapon, false, statsInput));
        trueHp = bankersRound(calculateStatAprox(false, isWeapon, false, statsInput));
    }
    
    powAtk = Math.floor(calculateStatAprox(true, isWeapon, true, statsInput));
    powHp = Math.floor(calculateStatAprox(false, isWeapon, true, statsInput));

    let finalPower = calculateFinalPower(powAtk, powHp, isWeapon, statsInput.mastery, statsInput.starsMax);

    if (includePassives && window.currentAwkBonusAtk && window.currentAwkBonusHp && !isWeapon) {
        // 勾选被动属性参与显示面板 (纯面板增加，不影响战力)
        let bAtk = 0, bHp = 0;
        for (let i = 0; i <= statsInput.awakening; i++) {
            bAtk += (window.currentAwkBonusAtk[i] || 0);
            bHp += (window.currentAwkBonusHp[i] || 0);
        }
        trueAtk += bAtk;
        trueHp += bHp;
    }

    document.getElementById("res_atk").innerText = trueAtk.toLocaleString();
    document.getElementById("res_hp").innerText = trueHp.toLocaleString();
    document.getElementById("res_power").innerText = finalPower.toLocaleString();
};

// =====================================
// 数据拉取与页面构建
// =====================================
async function fetchLanguage() {
    const response = await fetch(url_lang);
    const text = await response.text();
    const lines = text.split(/\r?\n/);
    const regex = /^"((?:\\.|[^"])*)".*?=.*?"(.*)$/;
    let currentKey = null;
    let valueCollection = [];

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            if (currentKey !== null) dictionary[currentKey] = cleanText(valueCollection.join("\n").replace(/(?:(?<![\\])")+[^"]*\s*$/, ""));
            currentKey = match[1];
            valueCollection = [match[2]];
        } else {
            if (currentKey !== null) valueCollection.push(line);
        }
    }
    if (currentKey !== null) dictionary[currentKey] = cleanText(valueCollection.join("\n").replace(/(?:(?<![\\])")+[^"]*\s*$/, ""));
}

function cleanText(rawText) {
    if (!rawText) return "";
    return rawText.replace(/\\n/g, "<br>").replace(/\\r/g, "").replace(/\\t/g, "\t").replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/(?<!\\)\\/g, "");
}

async function fetchAbilities() {
    const response = await fetch(url_ability);
    const data = await response.json();
    for (let ability of data.Ability) abilityData[ability.name] = ability;
}
async function fetchBuffs() {
    const response = await fetch(url_buff);
    const data = await response.json();
    buffData = data.Buff;
}
async function fetchAbilityAI() {
    const response = await fetch(url_ability_ai);
    const data = await response.json();
    abilityAiData = data.AbilityAI;
}
async function fetchAIThreat() {
    const response = await fetch(url_ai_threat);
    const data = await response.json();
    for (let item of data.AIThreat) {
        if (!aiThreatData[item.name]) aiThreatData[item.name] = {};
        aiThreatData[item.name][item.condition] = item.value;
    }
}
async function fetchRelationships() {
    try {
        const response = await fetch(url_relationship);
        if(response.ok) {
            let data = await response.json();
            relationshipData = data.Relationship || data;
        }
    } catch(e) {
        console.log("未找到羁绊数据");
    }
}

function buildDropdown() {
    const selectEl = document.getElementById("monsterSelect");
    const searchText = document.getElementById("searchInput").value.toLowerCase();
    const isReverse = document.getElementById("reverseBtn").checked;
    
    // 从新的胶囊按钮获取选中的排序模式
    const sortMode = document.querySelector('input[name="sortMode"]:checked')?.value || "default";
    const currentSelected = selectEl.value; 

    let activeData = currentCategory === 'Monster' ? monsterData : 
                     currentCategory === 'Weapon' ? weaponData : 
                     currentCategory === 'Equipment' ? equipData : bossData;

    const activeRarities = Array.from(document.querySelectorAll('.filter-rarity:checked')).map(cb => cb.value);
    const activeElements = Array.from(document.querySelectorAll('.filter-element:checked')).map(cb => cb.value);
    const activeWeapons = Array.from(document.querySelectorAll('.filter-weapon:checked')).map(cb => cb.value);
    const activeWeapSkills = Array.from(document.querySelectorAll('.filter-weapskill:checked')).map(cb => cb.value);

    selectEl.innerHTML = "<option value=''>请选择或搜索一个目标...</option>"; 
    
    let familyMap = new Map();
    for (let i = 0; i < activeData.length; i++) {
        let item = activeData[i];
        let id = item.name;
        let baseId = id;
        let matchId = id.match(/^(.*?)(\d{2})$/);
        if (matchId) baseId = matchId[1];
        
        if (!familyMap.has(baseId) || id === baseId + "01") {
            familyMap.set(baseId, i);
        }
    }

    let matchedList = [];
    for (let [baseId, idx] of familyMap.entries()) {
        let item = activeData[idx];
        let id = item.name;
        
        let nameKey = currentCategory === 'Weapon' ? (item.family + "01NameKey") : (id + "NameKey");
        let name = dictionary[nameKey] || id;
        let name2 = dictionary[id + "SecondNameKey"];
        let fullName = name2 && name2 !== name ? `${name} - ${name2}` : name;
        
        // 针对Boss防止同名错选：在下拉列表名字里附加英文基底ID
        if (currentCategory === 'Boss') {
            fullName = `${fullName} (${baseId})`;
        }
        
        if (searchText && !fullName.toLowerCase().includes(searchText) && !id.toLowerCase().includes(searchText)) continue; 

        let stars = item.evolvedStars || item.accessoryStars || 0;
        let rarity = "N";
        if (stars >= 6) rarity = "SSR";
        else if (stars === 5) rarity = "SR";
        else if (stars === 4) rarity = "R";
        
        if (!activeRarities.includes(rarity)) continue;
        
        if (currentCategory === 'Monster' || currentCategory === 'Boss') {
            if (!activeElements.includes(item.element)) continue;
            let weapon2 = "";
            if (item.passives) {
                for (let key in item.passives) {
                    let pId = item.passives[key];
                    let buffInfo = buffData[pId];
                    if (buffInfo && buffInfo.tags && buffInfo.tags.includes("awkWep")) {
                        let pOverrides = buffInfo.behaviorOverrides;
                        if (pOverrides && pOverrides.length > 0 && pOverrides[0].weaponPref) weapon2 = pOverrides[0].weaponPref;
                    }
                }
            }
            if (!activeWeapons.includes(item.weaponPref) && !(weapon2 && activeWeapons.includes(weapon2))) continue;
        }

        if (currentCategory === 'Weapon') {
            if (!activeWeapons.includes(item.weaponPref)) continue;
            
            if (activeWeapSkills.length === 0) continue; 
            let hasSkill = false;
            if (item.passives) {
                for (let key in item.passives) {
                    let skillId = item.passives[key];
                    let skillName = dictionary[skillId + "NameKey"] || skillId;
                    if (activeWeapSkills.some(skillKeyword => skillName.includes(skillKeyword))) {
                        hasSkill = true;
                        break;
                    }
                }
            }
            if (!hasSkill) continue;
        }

        let form1 = activeData.find(m => m.name === baseId + "01") || item;
        let form2 = activeData.find(m => m.name === baseId + "02") || activeData.find(m => m.name === baseId + "03") || form1;

        let speedVal = currentCategory === 'Equipment' ? item.flatSpeed : (item.speed || 0);
        let a1 = currentCategory === 'Equipment' ? item.flatAttack : form1.baseAttack;
        let h1 = currentCategory === 'Equipment' ? item.flatMaxHp : form1.baseMaxHp;
        let a2 = currentCategory === 'Equipment' ? item.flatAttack : form2.baseAttack;
        let h2 = currentCategory === 'Equipment' ? item.flatMaxHp : form2.baseMaxHp;

        matchedList.push({ 
            index: idx, text: fullName, speed: speedVal, atk1: a1, hp1: h1, atk2: a2, hp2: h2, defaultIdx: idx
        });
    }

    matchedList.sort((a, b) => {
        if (sortMode === "speed") return b.speed - a.speed;
        if (sortMode === "atk1") return b.atk1 - a.atk1;
        if (sortMode === "hp1") return b.hp1 - a.hp1;
        if (sortMode === "atk2") return b.atk2 - a.atk2;
        if (sortMode === "hp2") return b.hp2 - a.hp2;
        return a.defaultIdx - b.defaultIdx;
    });

    if (isReverse) matchedList.reverse();

    if (matchedList.length === 0) {
        selectEl.innerHTML = "<option value=''>没有找到符合条件的目标...</option>"; 
    } else {
        matchedList.forEach(item => {
            let option = document.createElement("option");
            option.value = item.index; 
            option.textContent = item.text; 
            selectEl.appendChild(option);
        });
        if (currentSelected && selectEl.querySelector(`option[value="${currentSelected}"]`)) {
            selectEl.value = currentSelected;
        }
    }
}

function formatThreatData(threatObj) {
    if (!threatObj) return "";
    let str = "";
    for (let cond in threatObj) {
        str += `<span class="ai-tag">${cond}: ${threatObj[cond]}</span>`;
    }
    return str ? `<div style="margin-top: 8px;"><strong>仇恨判定:</strong><br>${str}</div>` : "";
}

function formatAIData(data) {
    let str = `基础目标权重 (BaseWeight): ${data.baseAITargetingWeight || 1}\n`;
    if (data.globalScalorsToIgnore) str += `忽略条件 (Ignore): ${data.globalScalorsToIgnore.join(', ')}\n`;
    if (data.aiTargetingSourceMonsterConditions) str += `自身条件 (Source): \n${JSON.stringify(data.aiTargetingSourceMonsterConditions, null, 2)}\n`;
    if (data.aiTargetingMonsterConditions) str += `目标条件 (Target): \n${JSON.stringify(data.aiTargetingMonsterConditions, null, 2)}`;
    return str;
}

window.showInfo = function(index, isFromDropdown = false) {
    const infoBox = document.getElementById("monsterInfo");
    if (index === "" || index === undefined) { infoBox.innerHTML = "请在上方选择或搜索..."; return; }
    
    let activeData = currentCategory === 'Monster' ? monsterData : 
                     currentCategory === 'Weapon' ? weaponData : 
                     currentCategory === 'Equipment' ? equipData : bossData;

    // 绑定至全局以备查询进化来源使用
    window.activeDataCache = activeData;

    let item = activeData[index];
    let id = item.name;
    let idLower = id.toLowerCase();
    
    let nameKey = currentCategory === 'Weapon' ? (item.family + "01NameKey") : (id + "NameKey");
    let name = dictionary[nameKey] || id;
    let name2 = dictionary[id + "SecondNameKey"];
    let fullName = name2 && name2 !== name ? `${name} - ${name2}` : name;
    
    let descKey = currentCategory === 'Weapon' ? (item.family + "01DescriptionKey") : (id + "DescriptionKey");
    let chineseDesc = dictionary[descKey] || "暂无简介";

    let baseId = id;
    let matchId = id.match(/^(.*?)(\d{2})$/);
    if (matchId) baseId = matchId[1]; 
    let currentStageNum = matchId ? matchId[2] : "01"; 
    
    let baseIdLower = baseId.toLowerCase();
    let id01 = baseIdLower + "01";
    let id02 = baseIdLower + "02";
    let id03 = baseIdLower + "03"; 

    let picToClick = 'btn-01'; 
    if (!isFromDropdown) {
        let activePicBtnBefore = document.querySelector('.gallery-btn.active');
        if (activePicBtnBefore) picToClick = activePicBtnBefore.id;
    }
    window.lastViewedBaseId = baseId;

    let switchDataHtml = "";
    if (currentCategory !== 'Equipment') {
        let formIndexes = [];
        for (let i = 0; i < activeData.length; i++) {
            let mName = activeData[i].name;
            let matchM = mName.match(/^(.*?)(\d{2})$/);
            if (matchM && matchM[1] === baseId) {
                formIndexes.push({idx: i, name: mName, formNum: parseInt(matchM[2])});
            }
        }
        formIndexes.sort((a,b) => a.formNum - b.formNum);
        if (formIndexes.length > 1) {
            switchDataHtml += `<div style="margin: 10px 0 20px 0; padding: 12px; background: #e3f2fd; border-radius: 8px; border: 1px solid #bbdefb;">
                <strong style="color: #0d47a1; margin-right: 10px;">📊 阶段数据切换：</strong>`;
            formIndexes.forEach(f => {
                let numStr = f.formNum === 1 ? "一" : f.formNum === 2 ? "二" : f.formNum === 3 ? "三" : f.formNum;
                let activeClass = f.name === id ? "active" : "";
                switchDataHtml += `<button class="stage-btn ${activeClass}" onclick="showInfo(${f.idx})">形态${numStr}</button>`;
            });
            switchDataHtml += `</div>`;
        }
    }

    let elementText = item.element ? (dictionary[item.element + "Key"] || item.element) : "无";
    
    let weaponRawText = item.weaponPref ? (dictionary[item.weaponPref + "NameKey"] || item.weaponPref) : "无";
    let weaponText = weaponRawText.replace(/大锤/g, "大槌").replace(/巨锤/g, "大槌");
    
    let weapon2Text = "";
    
    // 给觉醒奖励留出真正的增量空间
    let awkBonusAtk = [0, 0, 0, 0, 0];
    let awkBonusHp = [0, 0, 0, 0, 0];

    if (item.passives && currentCategory !== 'Weapon') {
        for (let key in item.passives) {
            let pId = item.passives[key];
            let buffInfo = buffData[pId];
            if (buffInfo && buffInfo.tags && buffInfo.tags.includes("awkWep")) {
                let pOverrides = buffInfo.behaviorOverrides;
                if (pOverrides && pOverrides.length > 0 && pOverrides[0].weaponPref) {
                    let w2Id = pOverrides[0].weaponPref;
                    let w2Raw = dictionary[w2Id + "NameKey"] || w2Id;
                    weapon2Text = w2Raw.replace(/大锤/g, "大槌").replace(/巨锤/g, "大槌");
                }
            }
        }
        for (let i = 1; i <= 4; i++) {
            let pId = item.passives[i + 1]; 
            if (pId && buffData[pId]) {
                let overrides = buffData[pId].behaviorOverrides;
                if (overrides && overrides.length > 0 && overrides[0].flatStatBonuses) {
                    awkBonusAtk[i] = (overrides[0].flatStatBonuses.Attack || 0);
                    awkBonusHp[i]  = (overrides[0].flatStatBonuses.MaxHP || 0);
                }
            }
        }
    }
    window.currentAwkBonusAtk = awkBonusAtk;
    window.currentAwkBonusHp = awkBonusHp;

    let domain = currentCategory === 'Weapon' ? 'https://weapon.evertale.qzz.io' : 
                 currentCategory === 'Equipment' ? 'https://equipment.evertale.qzz.io' : 'https://monster.evertale.qzz.io';
    
    let avatarsHtml = "";
    if (currentCategory === 'Equipment') {
        avatarsHtml = `<div class="avatar-box"><img src="${domain}/headshot/${idLower}.png" onerror="this.parentElement.style.display='none'"></div>`;
    } else {
        avatarsHtml = `
            <div class="avatar-box"><img src="${domain}/headshot/${id01}.png" onerror="this.parentElement.style.display='none'"><div class="avatar-label">形态一</div></div>
            <div class="avatar-box"><img src="${domain}/headshot/${id02}.png" onerror="this.parentElement.style.display='none'"><div class="avatar-label">形态二</div></div>
            <div class="avatar-box"><img src="${domain}/headshot/${id03}.png" onerror="this.parentElement.style.display='none'"><div class="avatar-label">形态三</div></div>
        `;
    }

    let leaderSkillHtml = "";
    if (item.leaderBuff) {
        let lsName = dictionary[item.leaderBuff + "NameKey"] || item.leaderBuff;
        let lsDesc = dictionary[item.leaderBuff + "DescriptionKey"] || "缺少描述";
        leaderSkillHtml = `<div class="leader-skill-box"><span class="ls-title">👑 队长技能 - ${lsName}</span>${lsDesc}</div>`;
    }

    let stars = item.evolvedStars || item.accessoryStars || 0;
    let starsCurr = item.stars || item.accessoryStars || 0;
    let rarity = "N";
    if (stars >= 6) rarity = "SSR";
    else if (stars === 5) rarity = "SR";
    else if (stars === 4) rarity = "R";

    let relationHtml = "";
    let dialogHtml = "";
    if (currentCategory === 'Monster' || currentCategory === 'Boss') {
        if (Object.keys(relationshipData).length > 0) {
            let relGroupsHtml = "";
            for (let rKey in relationshipData) {
                let rel = relationshipData[rKey];
                if (rel.Families && (rel.Families.includes(baseId) || rel.Families.includes(baseId + "01") || rel.Families.includes(id))) {
                    let relName = dictionary[rel.Name] || rel.Name;
                    let relBonus = rel.Bonus ? rel.Bonus.replace("ATK", "攻击力").replace("HP", "生命值") : "";
                    
                    let cardsHtml = "";
                    rel.Families.forEach(memberId => {
                        let mBase = memberId;
                        let mMatch = memberId.match(/^(.*?)(\d{2})$/);
                        if (mMatch) mBase = mMatch[1];
                        
                        let mNameKey = mBase + "01NameKey";
                        let mTitleKey = mBase + "01SecondNameKey";
                        if (!dictionary[mNameKey]) mNameKey = mBase + "NameKey";
                        if (!dictionary[mTitleKey]) mTitleKey = mBase + "SecondNameKey";
                        
                        let mName = dictionary[mNameKey] || mBase;
                        let mTitle = dictionary[mTitleKey] || "";
                        
                        let targetIdx = monsterData.findIndex(m => m.name === mBase + "02");
                        if (targetIdx === -1) {
                            targetIdx = monsterData.findIndex(m => m.name === memberId || m.name === mBase + "01" || m.name === mBase);
                        }

                        let clickAction = targetIdx !== -1 ? `onclick="showInfo(${targetIdx}, true); window.scrollTo(0,0);"` : "";
                        
                        let imgId = memberId.toLowerCase();
                        let fallbackImgId = mBase.toLowerCase() + "01";
                        let fallbackImgId2 = mBase.toLowerCase();
                        
                        cardsHtml += `
                            <div class="rel-card" ${clickAction}>
                                <div class="rel-card-img">
                                    <img src="https://monster.evertale.qzz.io/headshot/${imgId}.png" onerror="this.src='https://monster.evertale.qzz.io/headshot/${fallbackImgId}.png'; this.onerror=()=>{this.src='https://monster.evertale.qzz.io/headshot/${fallbackImgId2}.png'; this.onerror=null;};">
                                </div>
                                <div class="rel-card-info">
                                    <div class="rel-card-name">${mName}</div>
                                    ${mTitle ? `<div class="rel-card-title">${mTitle}</div>` : ''}
                                </div>
                            </div>
                        `;
                    });

                    relGroupsHtml += `
                        <div class="rel-group">
                            <div class="rel-header">
                                <span class="rel-name-title">${relName}</span>
                                ${relBonus ? `<span class="rel-bonus-tag">${relBonus}</span>` : ''}
                            </div>
                            <div class="rel-cards">${cardsHtml}</div>
                        </div>
                    `;
                }
            }
            if (relGroupsHtml !== "") {
                relationHtml = `
                    <div class="rel-section">
                        <h3>🤝 伙伴羁绊</h3>
                        ${relGroupsHtml}
                    </div>
                `;
            }
        }

        let gachaIntro = dictionary[id + "GachaIntroText"] || dictionary[id01 + "GachaIntroText"] || dictionary[baseId + "01GachaIntroText"] || dictionary[item.family + "01GachaIntroText"];
        if (gachaIntro) dialogHtml += `<div class="dialog-item"><strong>✨ 召唤导言:</strong><br>${gachaIntro.replace(/\\n/g, '<br>')}</div>`;
        
        const dialogTypes = [{ key: 'gachaVoices', name: '抽卡对话', prefix: 'Gacha' }, { key: 'loginVoices', name: '登录对话', prefix: 'Login' }, { key: 'tapVoices', name: '点击对话', prefix: 'Tap' }, { key: 'idleVoices', name: '放置对话', prefix: 'Idle' }];
        dialogTypes.forEach(dt => {
            if (item[dt.key]) {
                dialogHtml += `<div class="dialog-item"><strong>💬 ${dt.name}:</strong><ul>`;
                item[dt.key].forEach(v => {
                    let dText = dictionary[item.family + dt.prefix + v + "Key"];
                    if (dText) dialogHtml += `<li>${dText.replace(/\\n/g, '<br>')}</li>`;
                });
                dialogHtml += `</ul></div>`;
            }
        });
        if (dialogHtml !== "") dialogHtml = `<div class="dialogue-section"><h3>🎭 角色语音与档案</h3>${dialogHtml}</div>`;
    }

    let activeSkillsHtml = "";
    let passiveSkillsHtml = "";
    
    if (currentCategory === 'Monster' || currentCategory === 'Boss') {
        let aiOverviewHtml = "";
        let threatInfo = aiThreatData[id] || aiThreatData[id01] || aiThreatData[baseId]; 
        if (item.aiTargetPickWeight !== undefined || threatInfo) {
            aiOverviewHtml = `
                <div class="ai-overview-box">
                    <strong>AI 基础判定 ➔</strong>
                    <span class="ai-tag">抓取权重 (PickWeight): ${item.aiTargetPickWeight || 1}</span>
                    ${formatThreatData(threatInfo)}
                </div>`;
        }
        activeSkillsHtml = `<h3><span>⚔️ 主动技能</span><button class="global-ai-btn" onclick="toggleAllAILogic(this)">一键展开所有 AI 逻辑</button></h3>${aiOverviewHtml}`;
        
        if (item.activeSkills && Object.keys(item.activeSkills).length > 0) {
            for (let key in item.activeSkills) {
                let skillId = item.activeSkills[key];
                let abilityInfo = abilityData[skillId] || {}; 
                let skillName = dictionary[(abilityInfo.nameKey || skillId) + "NameKey"] || skillId;
                let skillDesc = dictionary[(abilityInfo.descriptionKey || skillId) + "DescriptionKey"] || "缺少描述";
                let tu = abilityInfo.tuCost || 0;
                let spiritHtml = (abilityInfo.spiritCost > 0) ? `<span class="skill-badge badge-spirit-cost">-${abilityInfo.spiritCost} 灵气</span>` : (abilityInfo.spiritGain > 0) ? `<span class="skill-badge badge-spirit-gain">+${abilityInfo.spiritGain} 灵气</span>` : `<span class="skill-badge">+0 灵气</span>`;

                let aiKey = item.activeSkillsAI ? item.activeSkillsAI[key] : (abilityInfo.config + "_AI");
                let aiData = abilityAiData[aiKey];
                let aiHtml = aiData ? `<button class="ai-toggle-btn" onclick="toggleAILogic(this)">查看 AI 逻辑 ▼</button><div class="ai-logic-box" style="display: none;">${formatAIData(aiData)}</div>` : "";

                activeSkillsHtml += `<div class="skill-box"><div class="skill-header"><span class="skill-name">${skillName}</span><span class="skill-badge badge-tu">${tu} TU</span>${spiritHtml}</div><div class="skill-desc">${skillDesc}</div>${aiHtml}</div>`;
            }
        } else activeSkillsHtml += "<p>暂无主动技能</p>";

        passiveSkillsHtml = "<h3>🛡️ 被动技能</h3>";
        if (item.passives && Object.keys(item.passives).length > 0) {
            for (let key in item.passives) {
                let skillId = item.passives[key];
                let skillName = dictionary[skillId + "NameKey"] || skillId;
                let skillDesc = dictionary[skillId + "DescriptionKey"] || "缺少描述";
                passiveSkillsHtml += `<div class="skill-box"><div class="skill-header"><span class="skill-name">${skillName}</span></div><div class="skill-desc">${skillDesc}</div></div>`;
            }
        } else passiveSkillsHtml += "<p>暂无被动技能</p>";
    } else if (currentCategory === 'Weapon') {
        passiveSkillsHtml = "<h3>🗡️ 武器技能</h3>";
        if (item.passives && Object.keys(item.passives).length > 0) {
            for (let key in item.passives) {
                let skillId = item.passives[key];
                let skillName = dictionary[skillId + "NameKey"] || skillId;
                let skillDesc = dictionary[skillId + "DescriptionKey"] || "缺少描述";
                passiveSkillsHtml += `<div class="skill-box"><div class="skill-header"><span class="skill-name">${skillName}</span></div><div class="skill-desc">${skillDesc}</div></div>`;
            }
        } else passiveSkillsHtml += "<p>暂无武器技能</p>";
    }

    let cosmoHtml = "";
    if (item.cosmoName) {
        let cosmoDesc = dictionary[item.cosmoName + "DescriptionKey"];
        if (cosmoDesc) cosmoHtml = `<div class="desc-box" style="border-left-color: #FFC107;"><span class="desc-title" style="color: #FFC107;">✨ 满觉简介 (Ascended)</span>${cosmoDesc}</div>`;
    }

    let infoGridHtml = "";
    if (currentCategory === 'Equipment') {
        infoGridHtml = `
            <div class="info-grid">
                <div class="info-item"><span class="info-label">稀有度</span><span class="info-value" style="color: #222;">${rarity}</span></div>
                <div class="info-item"><span class="info-label">速度</span><span class="info-value">${item.flatSpeed}</span></div>
                
                <div class="info-item"><span class="info-label">基础攻击</span><span class="info-value">${item.flatAttack}</span></div>
                <div class="info-item"><span class="info-label">基础生命</span><span class="info-value">${item.flatMaxHp}</span></div>
            </div>
        `;
    } else {
        let weapLabel = currentCategory === 'Weapon' ? '种类' : '武器偏好';
        infoGridHtml = `
            <div class="info-grid">
                <div class="info-item"><span class="info-label">稀有度</span><span class="info-value" style="color: #222;">${rarity}</span></div>
                <div class="info-item"><span class="info-label">属性</span><span class="info-value">${elementText}</span></div>
                
                <div class="info-item"><span class="info-label">基础攻击</span><span class="info-value">${item.baseAttack}</span></div>
                <div class="info-item"><span class="info-label">基础生命</span><span class="info-value">${item.baseMaxHp}</span></div>
                
                <div class="info-item"><span class="info-label">速度</span><span class="info-value">${item.speed || 0}</span></div>
                <div class="info-item"><span class="info-label">${weapLabel}</span><span class="info-value"><span class="highlight-tag">${weaponText}</span> ${weapon2Text ? `<span class="highlight-tag">${weapon2Text}</span>` : ''}</span></div>
            </div>
        `;
    }

    let leftInfoHtml = `
        ${switchDataHtml}
        <div class="character-header">
            <div class="avatars-wrapper">
                ${avatarsHtml}
            </div>
            <div class="basic-info">
                <h2>${fullName} <span style="font-size: 0.5em; color: gray;">(${baseId})</span></h2>
                ${infoGridHtml}
                ${leaderSkillHtml}
            </div>
        </div>
        
        <div class="desc-box">
            <span class="desc-title">📖 简介</span>
            ${chineseDesc}
        </div>
        ${cosmoHtml}

        ${activeSkillsHtml}
        ${passiveSkillsHtml}
    `;

    let rightColHtml = "";
    if (currentCategory === 'Equipment') {
        rightColHtml = `
            <div class="portrait-gallery">
                <div class="images-container">
                    <img class="portrait-img" style="display:block;" src="${domain}/headshot/${idLower}.png" onerror="this.style.display='none'">
                </div>
            </div>
        `;
    } else {
        rightColHtml = `
            <div class="portrait-gallery">
                <div class="gallery-buttons">
                    <button id="btn-01" class="gallery-btn" onclick="switchPic('01')">形态一</button>
                    <button id="btn-02" class="gallery-btn" onclick="switchPic('02')">形态二</button>
                    <button id="btn-03" class="gallery-btn" onclick="switchPic('03')">形态三</button>
                    <button id="btn-tachie" class="gallery-btn" onclick="switchPic('tachie')">特殊立绘</button>
                </div>
                <div class="images-container">
                    <img id="pic-01" class="portrait-img" src="${domain}/portrait/${id01}.png" onerror="handleImgError('01')">
                    <img id="pic-02" class="portrait-img" src="${domain}/portrait/${id02}.png" onerror="handleImgError('02')">
                    <img id="pic-03" class="portrait-img" src="${domain}/portrait/${id03}.png" onerror="handleImgError('03')">
                    <img id="pic-tachie" class="portrait-img" src="https://tachie.evertale.qzz.io/${id01}.png" onerror="handleImgError('tachie')">
                </div>
            </div>
            ${dialogHtml}
            ${relationHtml}
        `;
    }

    let calculatorHtml = "";
    if (currentCategory === 'Monster' || currentCategory === 'Boss' || currentCategory === 'Weapon') {
        
        // 【核心】：精确还原TXT的进化继承基底 (ExtraEvoInitialCount) 算法
        let numInFamily = parseInt(currentStageNum);
        let minLb = numInFamily - 1;
        for (let i = numInFamily - 1; i > 0; i--) {
            let prevId = baseId + String(i).padStart(2, "0");
            let prevItem = activeData.find(m => m.name === prevId);
            if (prevItem && prevItem.freeEvolve) minLb--;
        }
        if (minLb < 0) minLb = 0;
        
        let maxLb = (stars > 3 && starsCurr === stars) ? minLb + 5 : minLb;
        let defaultLb = maxLb; 
        
        let defaultLevel = getMaxLv(starsCurr, stars, defaultLb - minLb);
        let defaultAwaken = stars > 3 ? 4 : 0;
        let defaultMastery = stars > 3 ? 40 : 0;
        let defaultCosmo = (stars >= 6 && starsCurr === 6 && defaultLevel >= 100) ? "checked" : "";
        
        let cosmoHtmlForCalc = "";
        let masteryHtmlForCalc = "";
        if (currentCategory === 'Weapon') {
            cosmoHtmlForCalc = `<span style="color:#aaa; font-size:0.9em;">(武器无法超越)</span>`;
            masteryHtmlForCalc = `<label class="calc-item" style="opacity: 0.5;">升华<input type="number" id="calc_mastery" value="0" disabled></label>`;
        } else {
            if (stars >= 6) cosmoHtmlForCalc = `<span style="display:flex; align-items:center; gap:5px;"><input type="checkbox" id="calc_cosmo" ${defaultCosmo} onchange="handleCosmoChange()"> 超越</span>`;
            else cosmoHtmlForCalc = `<span style="color:#aaa; font-size:0.9em;">(非 SSR 无法超越)</span>`;
            masteryHtmlForCalc = `<label class="calc-item">升华<input type="number" id="calc_mastery" value="${defaultMastery}" min="0" oninput="runCalculator()"></label>`;
        }

        calculatorHtml = `
            <div class="calc-container">
                <div class="calc-title">⚡ 战力模拟计算器</div>
                <input type="hidden" id="calc_id" value="${id}">
                <input type="hidden" id="calc_baseId" value="${baseId}">
                <input type="hidden" id="calc_minLb" value="${minLb}">
                <input type="hidden" id="calc_atkBase" value="${item.baseAttack || 0}">
                <input type="hidden" id="calc_hpBase" value="${item.baseMaxHp || 0}">
                <input type="hidden" id="calc_starsMax" value="${stars || 0}">
                <input type="hidden" id="calc_starsCurr" value="${starsCurr || 0}">
                <input type="hidden" id="calc_stageNum" value="${currentStageNum}">
                <input type="hidden" id="calc_category" value="${currentCategory}">

                <div class="calc-grid">
                    <label class="calc-item">等级<input type="number" id="calc_level" value="${defaultLevel}" min="1" oninput="handleLevelChange()"></label>
                    <label class="calc-item">突破次数<input type="number" id="calc_lb" value="${defaultLb}" min="0" oninput="handleLbChange()"></label>
                    <label class="calc-item">觉醒层数<input type="number" id="calc_awaken" value="${defaultAwaken}" min="0" oninput="handleAwakenChange()"></label>
                    <label class="calc-item">增幅<input type="number" id="calc_boost" value="300" min="0" oninput="runCalculator()"></label>
                    <label class="calc-item">潜能 %<input type="number" id="calc_refine" value="100" min="0" oninput="runCalculator()"></label>
                    ${masteryHtmlForCalc}
                    
                    <label class="calc-item" style="grid-column:span 2; display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-top: 1px dashed #bbdefb; padding-top: 10px; margin-top: 5px;">
                        ${cosmoHtmlForCalc}
                        <span style="display:flex; align-items:center; gap:5px; color:#e65100; font-weight:bold;"><input type="checkbox" id="calc_free_input" onchange="handleFreeInputChange()"> 自由输入(无视限制)</span>
                    </label>
                    
                    <div style="grid-column: span 2; display: flex; gap: 10px; margin-top: 5px;">
                        <button class="calc-btn" style="flex: 1; background: #ff9800; border: 1px solid #e65100; box-shadow: 0 2px 0 #e65100;" onclick="setMaxStats()">⚡ 一键满练</button>
                    </div>
                    
                    <div class="calc-results">
                        <div>实际攻击力: <span id="res_atk">0</span></div>
                        <div>实际生命值: <span id="res_hp">0</span></div>
                        <div>综合战力: <span id="res_power" style="font-size: 1.1em; color: #d84315;">0</span></div>
                        
                        ${currentCategory === 'Weapon' ? '' : `
                        <label style="margin-top: 8px; font-size: 0.85em; font-weight: normal; color: #555; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                            <input type="checkbox" id="calc_include_passives" checked onchange="runCalculator()"> 将被动词条属性计入实际面板 (不影响战力)
                        </label>`}
                    </div>
                </div>
            </div>
        `;
        rightColHtml += calculatorHtml;
    }

    infoBox.innerHTML = `
        <div class="main-container">
            <div class="info-left">${leftInfoHtml}</div>
            <div class="info-right">${rightColHtml}</div>
        </div>
    `;
    
    if (currentCategory !== 'Equipment') {
        window.handleLevelChange(); 
        window.runCalculator(); 
        
        setTimeout(() => {
            let targetPicBtn = document.getElementById(picToClick);
            if (!targetPicBtn || targetPicBtn.style.display === 'none') {
                targetPicBtn = document.getElementById('btn-01');
            }
            if (!targetPicBtn || targetPicBtn.style.display === 'none') {
                targetPicBtn = document.querySelector('.gallery-btn:not([style*="display: none"])');
            }
            if (targetPicBtn) targetPicBtn.click();
        }, 10);
    }
}

init();