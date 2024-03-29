/*
 * Copyright 2021-2021 Robbyxp1 @ github.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// Indicators

import { CreateImage, RemoveChildren, CreatePara } from "/jslib/elements.js"
import { TableRowMultitdlist } from "/jslib/tables.js"

var indicatoriconsize = 32;     //crappy but effective - set icon size statically

export function RequestIndicator()
{
    console.log("Request indicators");
    var msg = {
        requesttype: "indicator",
    };

    websocket.send(JSON.stringify(msg));
}

// image tag is assigned with [0] = name (of png), [1] = bindingname, [2] = flash it, [3] = confirmit [4] = keydelay [5] indicator state name to associate

function createIndicator(itype, enableit = true, tooltip = null)
{
    if (enableit)
    {
        if ( tooltip == null )
            tooltip = itype.replace(/([a-z](?=[A-Z]))/g, '$1 ');

        return CreateImage("/statusicons/" + itype + ".png", itype, indicatoriconsize, null, [itype, null,false,0,0,itype], tooltip);
    } 
    else
        return null;
}


function createAction(name, bindingname = null, enableit = true, flashit = 0, confirmit = false, tooltip = null, keydelay=101, overridename = null)
{
    if (enableit)
    {
        if (bindingname == null)
            bindingname = name;

        if (overridename == null)
            overridename = name;

        if (tooltip == null)
            tooltip = bindingname.replace(/([a-z](?=[A-Z]))/g, '$1 ');

        //console.log("create action image name:" + itype + " a:" + action + " ");
        return CreateImage("/statusicons/" + name + ".png", name, indicatoriconsize, ClickActionItem, [name, bindingname, flashit, confirmit, keydelay, overridename], tooltip);
    }
    else
        return null;
}

function createFlashAction(name, bindingname = null, enableit = true, tooltip = null, keydelay = 101, overridename=  null)
{
    return createAction(name, bindingname, enableit, 250, null, tooltip, keydelay, overridename);
}

var currentshiptype;
var currentinwing;
var currentsupercruise;
var currentlanded;
var currentdocked;

var websocket;

export function InitIndicator(websock, size)
{
    currentshiptype = "";
    websocket = websock;
    indicatoriconsize = size;
}

// names of elements
export function HandleIndicatorMessage(jdata, statuselement, actionelement, statusotherelement)
{
    var guifocus = jdata["GUIFocus"];

    if (guifocus == "GalaxyMap")                    // translate the GUI focus to appropriate true tags for the set indicator code
        jdata["GalaxyMapOpen"] = true;
    if (guifocus == "SystemMap")
        jdata["SystemMapOpen"] = true;

    console.log("Indicators Mod" + JSON.stringify(jdata));

    var newshiptype = jdata["ShipType"];                        // really its major mode from odyssey now, backwards compatible naming
    var newinwing = jdata["InWing"] != null && jdata["InWing"] == true;
    var newsupercruise = jdata["Supercruise"] != null && jdata["Supercruise"] == true;
    var newlanded = jdata["Landed"] != null && jdata["Landed"] == true;
    var newdocked = jdata["Docked"] != null && jdata["Docked"] == true;

    if (newshiptype != currentshiptype || newinwing != currentinwing || newsupercruise != currentsupercruise || newlanded != currentlanded || newdocked != currentdocked)
    {
        currentshiptype = newshiptype;       // SRV, MainShip, Fighter etc
        currentinwing = newinwing;
        currentsupercruise = newsupercruise;
        currentlanded = newlanded;
        currentdocked = newdocked;
        SetupIndicators(jdata, document.getElementById(statuselement), document.getElementById(actionelement));
    }

    SetIndicatorState(jdata, document.getElementById(statuselement));
    SetIndicatorState(jdata, document.getElementById(actionelement));

    if (statusotherelement != null)
    {
        var tstatusother = document.getElementById(statusotherelement);

        RemoveChildren(tstatusother);

        var str = "";

        if (jdata["BodyName"] != null && jdata["BodyName"] != "")
            str += "Body Name: " + jdata["BodyName"] + "\r\n";

        if (jdata["Firegroup"] >= 0 && newshiptype == "MainShip")
            str += "Fire Group: " + "ABCDEFGHIJK"[jdata["Firegroup"]] + "\r\n";

        if (jdata["ValidPips"])
        {
            str += "Pips: " + "S:" + jdata["Pips"][0] + " E:" + jdata["Pips"][1] + " W:" + jdata["Pips"][2] + "\r\n";
        }

        if (jdata["ValidPosition"])
        {
            str += "Pos: " + jdata["Position"][0].toFixed(4) + ", " + jdata["Position"][1].toFixed(4);

            if (jdata["ValidAltitude"])
            {
                var alt = jdata["Position"][2];
                if (alt > 5000)
                    str += " Alt: " + (alt / 1000.0).toFixed(1) + "km";
                else
                    str += " Alt: " + alt.toFixed(0) + "m";
            }

            if (jdata["ValidHeading"])
                str += " Hdr: " + jdata["Position"][3].toFixed(0);

            str += "\r\n";
        }

        if (jdata["ValidPlanetRadius"])
            str += "Radius: " + (jdata["PlanetRadius"] / 1000.0).toFixed(0) + "km\r\n";

        if (jdata["Gravity"] > 0 && jdata["Temperature"] > 0)
            str += "Gravity: " + jdata["Gravity"].toFixed(1) + "g, Temp: " + jdata["Temperature"] + "K\r\n";
        else if (jdata["Gravity"] > 0 )
            str += "Gravity: " + jdata["Gravity"].toFixed(1) + "g\r\n";
        else if (jdata["Temperature"] > 0)
            str += "Temperature: " + jdata["Temperature"] + "K\r\n";

        if (jdata["SelectedWeapon"] != null && jdata["SelectedWeapon"] != "" && jdata["SelectedWeapon"] != "$humanoid_fists" )
            str += "Weapon/Tool: " + jdata["SelectedWeaponLocalised"] + "\r\n";
        if (jdata["LegalState"] != null)
            str += "Legal State: " + jdata["LegalState"] + "\r\n";

        tstatusother.appendChild(CreatePara(str));
    }

}

function SetupIndicators(jdata,tstatus,tactions)
{
    RemoveChildren(tstatus);
    RemoveChildren(tactions);

    var innormalspace = !currentlanded && !currentdocked && !currentsupercruise;
    var notdockedlanded = !currentdocked && !currentlanded;

    console.log("Create Indicators with L:" + currentlanded + " D:" + currentdocked + " N:" + innormalspace + " W:" + currentinwing + " S:" + currentsupercruise);

    if (currentshiptype == "MainShip")
    {
        var statuslist = [
            createIndicator("Docked"), createIndicator("Landed"), createIndicator("ShieldsUp"),
            createIndicator("InWing"), createIndicator("ScoopingFuel", currentsupercruise), 
            createIndicator("LowFuel"), createIndicator("OverHeating"), createIndicator("IsInDanger", !currentdocked, "In Danger"),
            createIndicator("BeingInterdicted", currentsupercruise), createIndicator("FsdCharging", notdockedlanded),
            createIndicator("FsdMassLocked", innormalspace),
            createIndicator("FsdCooldown", currentsupercruise || innormalspace)
        ];

        tstatus.appendChild(TableRowMultitdlist(statuslist));

        var actionlist = [
            createAction("LandingGear", "LandingGearToggle",innormalspace),     // reported..
            createAction("Lights", "ShipSpotLightToggle"),
            createAction("FlightAssist", "ToggleFlightAssist", innormalspace),
            createAction("HardpointsDeployed", "DeployHardpointToggle", notdockedlanded),

            createAction("CargoScoopDeployed", "ToggleCargoScoop", innormalspace),
            createAction("NightVision", "NightVisionToggle", innormalspace),

            createAction("UseBoostJuice", null, innormalspace, 1500),    
            createAction("ShieldCell", "UseShieldCell", innormalspace,1000),
            createAction("Chaff", "FireChaffLauncher", innormalspace,1000),
            createAction("HeatSink", "DeployHeatSink", innormalspace,1000),
            createAction("ChargeECM", null, innormalspace, 1500),

            createAction("Supercruise", null, notdockedlanded),  // reported
            createFlashAction("HyperSuperCombination", null, notdockedlanded), // not reported
            createFlashAction("OrbitLinesToggle"),

            createFlashAction("CyclePreviousTarget"),
            createFlashAction("CycleNextTarget"),
            createFlashAction("SelectHighestThreat", null, innormalspace),
            createFlashAction("CyclePreviousHostileTarget", null, innormalspace),
            createFlashAction("CycleNextHostileTarget", null, innormalspace),

            createFlashAction("CyclePreviousSubsystem", null, innormalspace),
            createFlashAction("CycleNextSubsystem", null, innormalspace),

            createFlashAction("TargetWingman0", null, currentinwing),
            createFlashAction("TargetWingman1", null, currentinwing),
            createFlashAction("TargetWingman2", null, currentinwing),
            createFlashAction("SelectTargetsTarget", null, currentinwing),
            createFlashAction("WingNavLock", null, currentinwing),

            createFlashAction("TargetNextRouteSystem",null,currentsupercruise ),

            createFlashAction("CycleFireGroupPrevious"),
            createFlashAction("CycleFireGroupNext"),

            createFlashAction("IncreaseSystemsPower", null, !currentdocked),
            createFlashAction("IncreaseEnginesPower", null, !currentdocked),
            createFlashAction("IncreaseWeaponsPower", null, !currentdocked),
            createFlashAction("ResetPowerDistribution", null, !currentdocked),

            createFlashAction("OrderDefensiveBehaviour", null, innormalspace),
            createFlashAction("OrderAggressiveBehaviour", null, innormalspace),
            createFlashAction("OrderFocusTarget", null, innormalspace),
            createFlashAction("OrderHoldFire", null, innormalspace),
            createFlashAction("OrderHoldPosition", null, innormalspace),
            createFlashAction("OrderFollow", null, innormalspace),
            createFlashAction("OrderRequestDock", null, innormalspace),
            createFlashAction("OpenOrders", null, innormalspace),

            createAction("GalaxyMapOpen"),
            createAction("SystemMapOpen"),
            createFlashAction("FocusComms", "FocusCommsPanel"),
            createFlashAction("QuickComms", "QuickCommsPanel"),
            createFlashAction("Screenshot", "F10", true, "Screen Shot"),

            createAction("SilentRunning", "ToggleButtonUpInput", innormalspace,0,true, "Silent Running"),
        ];

        tactions.appendChild(TableRowMultitdlist(actionlist))
    }
    else if (currentshiptype == "SRV")
    {
        var statuslist = [
            createIndicator("SrvUnderShip"), createIndicator("LowFuel"), createIndicator("ShieldsUp")
        ];

        var actionlist = [
            createAction( "SrvHandbrake", "AutoBreakBuggyButton"),
            createAction( "SrvTurret", "ToggleBuggyTurretButton"),
            createAction( "SrvDriveAssist", "ToggleDriveAssist"),
            createAction( "Lights", "HeadlightsBuggyButton"),

            createFlashAction("RecallDismissShip", "F10"),

            createFlashAction( "IncreaseSystemsPower"),
            createFlashAction( "IncreaseEnginesPower"),
            createFlashAction( "IncreaseWeaponsPower"),
            createFlashAction( "ResetPowerDistribution"),

            createAction("GalaxyMapOpen"),
            createAction("SystemMapOpen"),
            createFlashAction("Screenshot", "F10", true, "Screen Shot"),
        ];

        tstatus.appendChild(TableRowMultitdlist(statuslist));
        tactions.appendChild(TableRowMultitdlist(actionlist));
    }
    else if (currentshiptype == "Fighter")
    {
        var statuslist = [
            createIndicator("ShieldsUp")
        ]

        var actionlist = [
            createAction("Lights", "ShipSpotLightToggle"),
            createAction("FlightAssist", "ToggleFlightAssist"),
            createAction("NightVision", "NightVisionToggle"),
            createFlashAction("IncreaseSystemsPower"),
            createFlashAction("IncreaseEnginesPower"),
            createFlashAction("IncreaseWeaponsPower"),
            createFlashAction("ResetPowerDistribution"),

            createFlashAction("OrderDefensiveBehaviour"),
            createFlashAction("OrderAggressiveBehaviour"),
            createFlashAction("OrderFocusTarget"),
            createFlashAction("OrderHoldFire"),
            createFlashAction("OrderHoldPosition"),
            createFlashAction("OrderFollow"),
            createFlashAction("OrderRequestDock"),
            createFlashAction("OpenOrders"),

            createAction("GalaxyMapOpen"),
            createAction("SystemMapOpen"),
            createFlashAction("Screenshot", "F10", true, "Screen Shot"),
        ];

        tstatus.appendChild(TableRowMultitdlist(statuslist));
        tactions.appendChild(TableRowMultitdlist(actionlist));
    }
    else if (currentshiptype == "OnFoot")
    {
        var statuslist = [
            createIndicator("ShieldsUp")
        ]

        var actionlist = [
            createFlashAction("HideWeapon", "HumanoidHideWeaponButton"),
            createFlashAction("PrimaryWeapon", "HumanoidSelectPrimaryWeaponButton"),
            createFlashAction("SecondaryWeapon", "HumanoidSelectSecondaryWeaponButton"),
            createFlashAction("Reload", "HumanoidReloadButton"),
            createFlashAction("PreviousWeapon", "HumanoidSelectPreviousWeaponButton"),
            createFlashAction("NextWeapon", "HumanoidSelectNextWeaponButton"),
            createFlashAction("SwitchWeapon", "HumanoidSwitchWeapon"),

            createFlashAction("PreviousGrenade", "HumanoidSelectPreviousGrenadeTypeButton"),
            createFlashAction("NextGrenade", "HumanoidSelectNextGrenadeTypeButton"),
            createFlashAction("FRAGGrenade", "HumanoidSelectFragGrenade"),
            createFlashAction("EMPGrenade", "HumanoidSelectEMPGrenade"),
            createFlashAction("ShieldGrenade", "HumanoidSelectShieldGrenade"),

            createFlashAction("ClearAuthority", "HumanoidClearAuthorityLevel"),
            createFlashAction("HealthPack", "HumanoidHealthPack"),
            createFlashAction("Battery", "HumanoidBattery"),

            createFlashAction("ShieldsUp", "HumanoidToggleShieldsButton"),
            createFlashAction("FlashLight", "HumanoidToggleFlashlightButton"), // the lights and nightvision flags do not turn on, if they did you would put: ,true,null,100,"Lights"),
            createFlashAction("NightVision", "HumanoidToggleNightVisionButton"),

            createFlashAction("SelectUtility", "HumanoidSelectUtilityWeaponButton"),
            createFlashAction("SelectRecharge", "HumanoidSwitchToRechargeTool"),
            createFlashAction("SelectComp", "HumanoidSwitchToCompAnalyser"),
            createFlashAction("SelectTool", "HumanoidSwitchToSuitTool"),
            createFlashAction("SelectToolMode", "HumanoidToggleToolModeButton"),

            createFlashAction("OnFootHelp", "HumanoidToggleMissionHelpPanelButton"),

            createFlashAction("GalaxyMapOpen", "GalaxyMapOpen_Humanoid"),
            createFlashAction("SystemMapOpen", "SystemMapOpen_Humanoid"),
            createFlashAction("FocusComms", "FocusCommsPanel_Humanoid"),
            createFlashAction("QuickComms", "QuickCommsPanel_Humanoid"),

            createFlashAction("OpenAccessPanel", "HumanoidOpenAccessPanelButton",true, null, 1000),
        //    createAction("ConflictPanel", "HumanoidConflictContextualUIButton"),
        ];

        tstatus.appendChild(TableRowMultitdlist(statuslist));
        tactions.appendChild(TableRowMultitdlist(actionlist));
    }
    else if (currentshiptype == "Multicrew")
    {
        tstatus.appendChild(CreatePara("Multicrew not supported yet"));
    }
    else
    {
        tstatus.appendChild(CreatePara("Elite not running/Unknown mode"));
    }
}

function SetIndicatorState(jdata, tstatus)
{
    //const keys = Object.keys(jdata);
    //if (keys.indexOf(z.tag) != -1)
    //{
    //    console.log(".. " + z.tag + " value is " + jdata[z.tag]);
    //}
    tstatus.childNodes.forEach(function (x)     // tr's
    {
        x.childNodes.forEach(function (y)       // td's
        {
            y.childNodes.forEach(function (y1)       // Div due to toolbar
            {
                y1.childNodes.forEach(function (z)   // imgs and spans
                {
                    if (z.nodeName == "IMG" && z.tag != null)
                    {
                        //console.log("Entry is " + z.nodeName + " " + z.tag);

                        var indicator = z.tag[5];

                        if (indicator != null)      // presuming this works if z.tag is not defined.
                        {
                            if (jdata[indicator] != null && jdata[indicator] == true)
                            {
                                z.classList.add("entryselected");       // using a class means it does not mess up all the other properties.
                            }
                            else
                            {
                                z.classList.remove("entryselected");
                            }
                        }
                    }
                });
            });
        });
    });

}

function ClickActionItem(e)
{
    if (e.target.tag[3])
    {
        if (!confirm("Confirm " + e.target.tag[0]))
            return;
    } 

    console.log("Press key " + e.target.tag[1]);
    var msg = {
        requesttype: "presskey",
        key: e.target.tag[1],
        keydelay: e.target.tag[4],
    };

    websocket.send(JSON.stringify(msg));

    if (e.target.tag[2]>0)
    {
        e.target.classList.add("entryselected");       // using a class means it does not mess up all the other properties.
        console.log("Flash it! " + e.target.tag[2]);
        setTimeout(function (f)
        {
            console.log("Flash off!")
            e.target.classList.remove("entryselected");       // using a class means it does not mess up all the other properties.
        }, e.target.tag[2]);
    }
}

