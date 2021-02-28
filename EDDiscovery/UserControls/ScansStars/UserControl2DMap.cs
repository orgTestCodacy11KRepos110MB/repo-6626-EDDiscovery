﻿/*
 * Copyright © 2015 - 2017 EDDiscovery development team
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
 * 
 * EDDiscovery is not affiliated with Frontier Developments plc.
 */

using BaseUtils;
using EliteDangerousCore;
using EliteDangerousCore.DB;
using EMK.LightGeometry;
using System;
using System.Collections.Generic;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;

namespace EDDiscovery.UserControls
{
    public partial class UserControl2DMap : UserControlCommonBase
    {
        public List<Map2d> images;
        private Map2d currentimage;
        
        private DateTime startDate, endDate;
        public bool DisplayTestGrid = false;

        private DateTimePicker pickerStart, pickerStop;
        ToolStripControlHost host1, host2;
        List<Point3D> starpositions = null;

        List<HistoryEntry> syslist;

        public UserControl2DMap() 
        {
            InitializeComponent();
        }

        public override void Init()
        {
            syslist = HistoryList.FilterByFSDCarrierJumpAndPosition(discoveryform.history.EntryOrder());

            pickerStart = new DateTimePicker();
            pickerStop = new DateTimePicker();
            host1 = new ToolStripControlHost(pickerStart);
            toolStrip.Items.Add(host1);
            host2 = new ToolStripControlHost(pickerStop);
            toolStrip.Items.Add(host2);
            pickerStart.Value = DateTime.Today.AddMonths(-1);

            this.pickerStart.ValueChanged += new System.EventHandler(this.dateTimePickerStart_ValueChanged);
            this.pickerStop.ValueChanged += new System.EventHandler(this.dateTimePickerStop_ValueChanged);

            startDate = new DateTime(2010, 1, 1);

            images = EDDiscovery.Icons.IconMaps.StandardMaps();
            images.AddRange(Map2d.LoadFromFolder(EDDOptions.Instance.MapsAppDirectory()));

            toolStripComboExpo.Items.Clear();

            foreach (Map2d img in images)
            {
                toolStripComboExpo.Items.Add(img.FileName);
            }

            toolStripComboBoxTime.Items.AddRange(new string[] {
            "Last Week".T(EDTx.Form2DMap_LastWeek),
            "Last Month".T(EDTx.Form2DMap_LastMonth),
            "Last Year".T(EDTx.Form2DMap_LastYear),
            "All".T(EDTx.Form2DMap_All),
            "Custom".T(EDTx.Form2DMap_Custom)});

            toolStripComboExpo.SelectedIndex = 0;       // causes a display
            toolStripComboBoxTime.SelectedIndex = 3;
            
            imageViewer.BackColor = Color.FromArgb(5, 5, 5);

            BaseUtils.Translator.Instance.Translate(this);

            discoveryform.OnHistoryChange += Discoveryform_OnHistoryChange;
        }

        private void Discoveryform_OnHistoryChange(HistoryList obj)
        {
            syslist = HistoryList.FilterByFSDCarrierJumpAndPosition(discoveryform.history.EntryOrder());
            Display();
        }

        public override void Closing()
        {
            discoveryform.OnHistoryChange -= Discoveryform_OnHistoryChange;
            imageViewer.Image?.Dispose();
            imageViewer.Image = null;
            foreach (var i in images)
                i.Dispose();
            images = null;
            starpositions = null;
        }

        private void Display()
        {
            string str = toolStripComboExpo.SelectedItem.ToString();

            Map2d map = images.FirstOrDefault(i => i.FileName == str);

            if (map != null)
            {
                try
                {
                    imageViewer.Image?.Dispose();
                    imageViewer.Image = (Bitmap)map.Image.Clone();      // clone as we are going to draw on it.
                    imageViewer.ZoomToFit();
                    currentimage = map;
                    if (toolStripButtonStars.Checked)
                        DrawStars();

                    DrawTravelHistory();
                }
                catch ( Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("Loading 2dmap " + ex);
                    imageViewer.Image = null;
                }


                imageViewer.Invalidate();
            }
        }

        private void DrawTravelHistory()
        {
            DateTime start = startDate;

            int currentcmdr = EDCommander.CurrentCmdrID;

            List<HistoryEntry> jumps = (from systems in syslist where systems.System.HasCoordinate && systems.EventTimeUTC.ToLocalTime() > start && systems.EventTimeUTC.ToLocalTime() < endDate && systems.IsLocOrJump orderby systems.EventTimeUTC select systems).ToList();

            Color drawcolour = Color.Green;

            using (Graphics gfx = Graphics.FromImage(imageViewer.Image))
            {
                for (int ii = 0; ii < jumps.Count-1; ii++)
                {
                    if (jumps[ii].journalEntry is IJournalJumpColor)
                    {
                        drawcolour = Color.FromArgb(((IJournalJumpColor)jumps[ii].journalEntry).MapColor);
                        if (drawcolour.GetBrightness() < 0.05)
                            drawcolour = Color.Red;
                    }

                    using (Pen pen = new Pen(drawcolour, 2))
                        DrawLine(gfx, pen, jumps[ii].System, jumps[ii+1].System);
                }

                if (DisplayTestGrid)
                    TestGrid(gfx);
            }
        }

        private void DrawStars()
        {
            Cursor.Current = Cursors.WaitCursor;

            if ( starpositions == null )
                starpositions = SystemsDB.GetStarPositions(10,(x,y,z)=> { return new Point3D(x, y, z); });     // limit to 10%

            using (Pen pen = new Pen(Color.White, 2))
            using (Graphics gfx = Graphics.FromImage(imageViewer.Image))
            {
                foreach (Point3D si in starpositions)
                {
                    DrawPoint(gfx, pen, si.X,si.Z );
                }
            }

            Cursor.Current = Cursors.Default;
        }

        private void DrawLine(Graphics gfx, Pen pen, ISystem sys1, ISystem sys2)
        {
            gfx.DrawLine(pen, Transform2Screen(currentimage.TransformCoordinate(new Point((int)sys1.X, (int)sys1.Z))), Transform2Screen(currentimage.TransformCoordinate(new Point((int)sys2.X, (int)sys2.Z))));
        }

        private void DrawPoint(Graphics gfx, Pen pen, double x, double z)
        {
            Point point = Transform2Screen(currentimage.TransformCoordinate(new Point((int)x, (int)z)));
            gfx.FillRectangle(pen.Brush, point.X, point.Y, 1, 1);
        }

        private void TestGrid(Graphics gfx)
        {
            using (Pen pointPen = new Pen(Color.LawnGreen, 3))
                for (int x = currentimage.BottomLeft.X; x <= currentimage.BottomRight.X; x += 1000)
                    for (int z = currentimage.BottomLeft.Y; z <= currentimage.TopLeft.Y; z += 1000)
                        gfx.DrawLine(pointPen, currentimage.TransformCoordinate(new Point(x, z)), currentimage.TransformCoordinate(new Point(x + 10, z)));
        }

        private Point Transform2Screen(Point point)
        {
            return point;
        }

        private void toolStripComboBoxExpo_SelectedIndexChanged(object sender, EventArgs e)
        {
            Display();
        }


        private void toolStripComboBoxTime_SelectedIndexChanged(object sender, EventArgs e)
        {
            int nr = toolStripComboBoxTime.SelectedIndex;
            /*
            Last Week
            Last Month
            Last Year
            All
            */

            endDate = DateTime.Today.AddDays(1);
            if (nr == 0)
                startDate = DateTime.Now.AddDays(-7);
            else if (nr == 1)
                startDate = DateTime.Now.AddMonths(-1);
            else if (nr == 2)
                startDate = DateTime.Now.AddYears(-1);
            else if (nr == 3)
                startDate = new DateTime(2010, 8, 1);
            else if (nr == 4)  // Custom
                startDate = new DateTime(2010, 8, 1);

            if (nr == 4)
            {
                host1.Visible = true;
                host2.Visible = true;
                endDate = pickerStop.Value;
                startDate = pickerStart.Value;
            }
            else
            {
                host1.Visible = false;
                host2.Visible = false;
                endDate = DateTime.Today.AddDays(1);
            }
            
            Display();
        }

        private void toolStripButtonZoomIn_Click(object sender, EventArgs e)
        {
            imageViewer.ZoomIn();
        }

        private void dateTimePickerStart_ValueChanged(object sender, EventArgs e)
        {
            startDate = pickerStart.Value;
            Display();
        }

        private void dateTimePickerStop_ValueChanged(object sender, EventArgs e)
        {
            endDate = pickerStop.Value;
            Display();
        }

        private void toolStripButtonStars_Click(object sender, EventArgs e)
        {
            Display();
        }

        private void toolStripButtonSave_Click(object sender, EventArgs e)
        {
            if (saveFileDialog1.ShowDialog(this) == DialogResult.OK)
            {
                switch (saveFileDialog1.FilterIndex)
                {
                    case 1:
                        imageViewer.Image.Save(saveFileDialog1.FileName, System.Drawing.Imaging.ImageFormat.Png);
                        break;
                    case 2:
                        imageViewer.Image.Save(saveFileDialog1.FileName, System.Drawing.Imaging.ImageFormat.Bmp);
                        break;
                    case 3:
                        imageViewer.Image.Save(saveFileDialog1.FileName, System.Drawing.Imaging.ImageFormat.Jpeg);
                        break;
                }
            }
        }

        private void toolStripButtonZoomOut_Click(object sender, EventArgs e)
        {
            imageViewer.ZoomOut();
        }

        private void toolStripButtonZoomtoFit_Click(object sender, EventArgs e)
        {
            imageViewer.ZoomToFit();
        }
    }
}
