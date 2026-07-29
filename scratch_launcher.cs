using System;
using System.Diagnostics;
using System.IO;

namespace StavyaHMS
{
    class Program
    {
        [STAThread]
        static void Main()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string packagedExe = Path.Combine(baseDir, @"dist\exe\win-unpacked\Stavya Intelligence HMS.exe");
            string nodeElectron = Path.Combine(baseDir, @"node_modules\electron\dist\electron.exe");
            string mainJs = Path.Combine(baseDir, @"electron\main.js");

            ProcessStartInfo psi = new ProcessStartInfo();

            if (File.Exists(packagedExe))
            {
                psi.FileName = packagedExe;
                psi.WorkingDirectory = baseDir;
            }
            else if (File.Exists(nodeElectron) && File.Exists(mainJs))
            {
                psi.FileName = nodeElectron;
                psi.Arguments = "\"" + mainJs + "\"";
                psi.WorkingDirectory = baseDir;
            }
            else
            {
                string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
                string indexPath = Path.Combine(baseDir, "index.html");
                if (File.Exists(chromePath) && File.Exists(indexPath))
                {
                    psi.FileName = chromePath;
                    psi.Arguments = "--app=\"file:///" + indexPath.Replace('\\', '/') + "\"";
                }
            }

            psi.UseShellExecute = true;

            try
            {
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                System.Windows.Forms.MessageBox.Show("Unable to start Stavya HMS: " + ex.Message, "Stavya HMS");
            }
        }
    }
}
