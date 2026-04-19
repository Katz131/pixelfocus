// volume-host-wrapper.cs — Invisible native messaging host wrapper
// Launches volume-host.ps1 via PowerShell with no visible window,
// piping stdin/stdout so Chrome native messaging works correctly.
using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

class VolumeHostWrapper
{
    static void Main()
    {
        string exeDir = Path.GetDirectoryName(
            System.Reflection.Assembly.GetExecutingAssembly().Location);
        string ps1 = Path.Combine(exeDir, "volume-host.ps1");

        var psi = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = "-NoProfile -NoLogo -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + ps1 + "\"",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };

        Process proc;
        try
        {
            proc = Process.Start(psi);
        }
        catch
        {
            return;
        }

        // Pipe our stdin to child stdin (Chrome sends the message here)
        var stdinThread = new Thread(() =>
        {
            try
            {
                using (var input = Console.OpenStandardInput())
                using (var childIn = proc.StandardInput.BaseStream)
                {
                    byte[] buf = new byte[4096];
                    int read;
                    while ((read = input.Read(buf, 0, buf.Length)) > 0)
                    {
                        childIn.Write(buf, 0, read);
                        childIn.Flush();
                    }
                    childIn.Close();
                }
            }
            catch { }
        });
        stdinThread.IsBackground = true;
        stdinThread.Start();

        // Pipe child stdout to our stdout (response goes back to Chrome)
        try
        {
            using (var childOut = proc.StandardOutput.BaseStream)
            using (var output = Console.OpenStandardOutput())
            {
                byte[] buf = new byte[4096];
                int read;
                while ((read = childOut.Read(buf, 0, buf.Length)) > 0)
                {
                    output.Write(buf, 0, read);
                    output.Flush();
                }
            }
        }
        catch { }

        proc.WaitForExit(10000);
    }
}
