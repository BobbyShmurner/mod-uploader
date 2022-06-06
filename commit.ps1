param (
	[Parameter(Mandatory)]
	[String] $CommitMessage
)

ncc build index.js --license licenses.txt

git add .
git commit -m $CommitMessage
git push